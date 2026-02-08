"""
Forecasting and restock-date logic using Darts (exponential smoothing).

Input: daily demand = inventory start of day (AM) - inventory end of day (EOD) = units consumed per day.
Output: predicted daily demand, total stock needed over horizon, restock date, and confidence interval.
"""

from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from darts import TimeSeries
from darts.models import ExponentialSmoothing
from darts.utils.utils import ModelMode, SeasonalityMode
from sqlalchemy.orm import Session

from models import Snapshot, InventoryCount


# Minimum days of (AM, EOD) pairs needed to fit the model
MIN_DAYS_FOR_FORECAST = 2

# Default forecast horizon (days)
DEFAULT_HORIZON = 14

# Number of samples for probabilistic forecast (restock-date confidence)
NUM_SAMPLES = 500

# Quantiles for restock-date confidence interval (e.g. 0.1, 0.9 => 80% interval)
RESTOCK_QUANTILE_LOW = 0.1
RESTOCK_QUANTILE_HIGH = 0.9


def _date_floor(ts: datetime) -> datetime:
    """Floor timestamp to date (midnight UTC)."""
    return ts.replace(hour=0, minute=0, second=0, microsecond=0)


def build_daily_demand_series(
    db: Session,
    product_type: str,
    store_name: Optional[str] = None,
) -> Optional[pd.Series]:
    """
    Build a univariate daily demand series for one product.

    Demand = AM count - EOD count (units consumed that day). Pairs snapshots by calendar day;
    each day must have both an AM and an EOD snapshot.

    Returns a pandas Series with DatetimeIndex (date) and demand values, or None if insufficient data.
    """
    query = (
        db.query(Snapshot)
        .filter(
            Snapshot.id.in_(
                db.query(InventoryCount.snapshot_id).filter(
                    InventoryCount.product_type == product_type
                )
            )
        )
        .order_by(Snapshot.timestamp.asc())
    )
    if store_name is not None:
        query = query.filter(Snapshot.store_name == store_name)
    snapshots = query.all()

    # Group counts by snapshot date and time_of_day
    by_date: dict[datetime, dict[str, int]] = {}
    for s in snapshots:
        d = _date_floor(s.timestamp)
        if d not in by_date:
            by_date[d] = {}
        for c in s.counts:
            if c.product_type != product_type:
                continue
            by_date[d][s.time_of_day] = c.count

    # Build daily demand: AM - EOD = consumption
    rows = []
    for d, tod_counts in sorted(by_date.items()):
        if "AM" in tod_counts and "EOD" in tod_counts:
            demand = tod_counts["AM"] - tod_counts["EOD"]
            rows.append({"date": d, "demand": demand})
    if len(rows) < MIN_DAYS_FOR_FORECAST:
        return None

    df = pd.DataFrame(rows).set_index("date").sort_index()
    return df["demand"]


def get_forecastable_product_types(
    db: Session,
    store_name: Optional[str] = None,
) -> list[str]:
    """
    Return product types that have at least MIN_DAYS_FOR_FORECAST days of AM+EOD pairs.
    """
    product_types = (
        db.query(InventoryCount.product_type)
        .distinct()
        .all()
    )
    product_types = [p[0] for p in product_types]
    forecastable = []
    for pt in product_types:
        if build_daily_demand_series(db, pt, store_name) is not None:
            forecastable.append(pt)
    return sorted(forecastable)


def forecast_demand(
    demand_series: pd.Series,
    horizon: int = DEFAULT_HORIZON,
    num_samples: int = 1,
    random_state: Optional[int] = 42,
) -> tuple[TimeSeries, Optional[TimeSeries]]:
    """
    Fit exponential smoothing on daily demand and predict future demand.

    Uses univariate exponential smoothing (no trend, no seasonality by default)
    for stability with short retail series.

    Returns:
        - point_forecast: deterministic forecast (or probabilistic if num_samples > 1).
        - samples_forecast: probabilistic forecast (num_samples paths) if num_samples > 1, else None.
    """
    ts = TimeSeries.from_series(demand_series, fill_missing_dates=True, fillna_value=0)
    model = ExponentialSmoothing(
        trend=ModelMode.NONE,
        seasonal=SeasonalityMode.NONE,
        random_state=random_state,
    )
    model.fit(ts)

    if num_samples <= 1:
        pred = model.predict(n=horizon, num_samples=1)
        return pred, None

    pred_point = model.predict(n=horizon, num_samples=1)
    pred_samples = model.predict(n=horizon, num_samples=num_samples)
    return pred_point, pred_samples


def restock_day_from_path(
    current_inventory: float,
    demand_path: np.ndarray,
    safety_stock: float = 0,
) -> Optional[int]:
    """
    Find the first day index (0-based) when inventory would hit safety_stock or below.

    current_inventory: on-hand at start of forecast (e.g. latest EOD count).
    demand_path: 1D array of predicted daily demand (consumption) for each day.
    Returns None if inventory never hits the threshold within the path length.
    """
    inv = current_inventory
    for i, d in enumerate(demand_path):
        inv -= float(d)
        if inv <= safety_stock:
            return i
    return None


def restock_date_with_confidence(
    current_inventory: float,
    samples_forecast: TimeSeries,
    start_date: datetime,
    safety_stock: float = 0,
) -> dict:
    """
    Compute restock date (median) and confidence interval from probabilistic demand forecast.

    samples_forecast: from model.predict(n=horizon, num_samples=N) (N x horizon).
    start_date: first day of forecast (day after last observed).
    Returns dict with restock_date_median, restock_date_low, restock_date_high, confidence_level, restock_days (all paths).
    """
    # (n_components, n_timesteps, n_samples) -> take first component, then (n_timesteps, n_samples)
    vals = samples_forecast.values()
    if vals.ndim == 3:
        # (n_timesteps, n_components, n_samples) in newer Darts
        demand_matrix = np.squeeze(vals)
        if demand_matrix.ndim == 3:
            demand_matrix = demand_matrix[:, 0, :]  # (n_timesteps, n_samples)
    else:
        demand_matrix = np.squeeze(vals)  # (n_timesteps,) or (n_timesteps, n_samples)
    if demand_matrix.ndim == 1:
        demand_matrix = demand_matrix[:, np.newaxis]

    n_days, n_samples = demand_matrix.shape
    restock_days: list[Optional[int]] = []
    for s in range(n_samples):
        path = demand_matrix[:, s]
        day = restock_day_from_path(current_inventory, path, safety_stock)
        restock_days.append(day)

    # Replace None with n_days (beyond horizon) for percentile computation
    days_for_quantile = [d if d is not None else n_days for d in restock_days]
    days_arr = np.array(days_for_quantile)
    median_day = float(np.median(days_arr))
    low_day = float(np.quantile(days_arr, RESTOCK_QUANTILE_LOW))
    high_day = float(np.quantile(days_arr, RESTOCK_QUANTILE_HIGH))
    confidence_level = RESTOCK_QUANTILE_HIGH - RESTOCK_QUANTILE_LOW

    def day_to_date(day_float: float) -> str:
        d = int(round(day_float))
        if d >= n_days:
            d = n_days
        target = start_date + timedelta(days=d)
        return target.isoformat() if hasattr(target, "isoformat") else str(target)

    return {
        "restock_date_median": day_to_date(median_day),
        "restock_date_low": day_to_date(low_day),
        "restock_date_high": day_to_date(high_day),
        "confidence_level": round(confidence_level, 2),
        "restock_day_median": median_day,
        "restock_day_low": low_day,
        "restock_day_high": high_day,
    "paths_within_horizon": sum(1 for d in restock_days if d is not None),
}


def run_forecast_from_series(
    demand_series: pd.Series,
    current_inventory: float,
    horizon: int = DEFAULT_HORIZON,
    safety_stock: float = 0,
    num_samples: int = NUM_SAMPLES,
    product_type: Optional[str] = None,
    store_name: Optional[str] = None,
) -> dict:
    """
    Run the full forecast pipeline from a demand series and current inventory (no DB).

    Use this to test forecasting without a database. demand_series should have a
    DatetimeIndex; current_inventory is the on-hand count at the start of the forecast.
    """
    if len(demand_series) < MIN_DAYS_FOR_FORECAST:
        raise ValueError(
            f"Need at least {MIN_DAYS_FOR_FORECAST} days of demand data, got {len(demand_series)}"
        )

    point_forecast, samples_forecast = forecast_demand(
        demand_series,
        horizon=horizon,
        num_samples=num_samples,
    )
    point_values = point_forecast.values().flatten()
    predicted_demand_per_day = [float(x) for x in point_values]
    predicted_stock_needed = float(np.maximum(0, point_values).sum())

    last_date = demand_series.index[-1]
    if isinstance(last_date, pd.Timestamp):
        last_date = last_date.to_pydatetime()
    start_date = last_date + timedelta(days=1)

    result = {
        "product_type": product_type,
        "store_name": store_name,
        "current_inventory": current_inventory,
        "horizon_days": horizon,
        "predicted_demand_per_day": predicted_demand_per_day,
        "predicted_stock_needed": round(predicted_stock_needed, 2),
        "demand_history_days": len(demand_series),
    }

    if samples_forecast is not None:
        restock = restock_date_with_confidence(
            current_inventory,
            samples_forecast,
            start_date,
            safety_stock=safety_stock,
        )
        result["restock_date_median"] = restock["restock_date_median"]
        result["restock_date_low"] = restock["restock_date_low"]
        result["restock_date_high"] = restock["restock_date_high"]
        result["restock_confidence_level"] = restock["confidence_level"]
        result["restock_day_median"] = restock["restock_day_median"]
        result["restock_day_low"] = restock["restock_day_low"]
        result["restock_day_high"] = restock["restock_day_high"]
    else:
        day = restock_day_from_path(current_inventory, point_values, safety_stock)
        if day is not None:
            restock_date = (start_date + timedelta(days=day)).date().isoformat()
            result["restock_date_median"] = restock_date
            result["restock_confidence_level"] = None
        else:
            result["restock_date_median"] = (start_date + timedelta(days=horizon)).date().isoformat()
            result["restock_confidence_level"] = None

    return result


def run_forecast(
    db: Session,
    product_type: str,
    store_name: Optional[str] = None,
    horizon: int = DEFAULT_HORIZON,
    safety_stock: float = 0,
) -> Optional[dict]:
    """
    Full pipeline: build demand series from DB, fit model, predict, compute restock date and confidence.

    Returns a dict with forecast and restock info, or None if insufficient data.
    """
    demand_series = build_daily_demand_series(db, product_type, store_name)
    if demand_series is None or len(demand_series) < MIN_DAYS_FOR_FORECAST:
        return None

    latest_eod_q = (
        db.query(InventoryCount)
        .join(Snapshot, InventoryCount.snapshot_id == Snapshot.id)
        .filter(
            InventoryCount.product_type == product_type,
            Snapshot.time_of_day == "EOD",
        )
    )
    if store_name is not None:
        latest_eod_q = latest_eod_q.filter(Snapshot.store_name == store_name)
    latest_eod = latest_eod_q.order_by(Snapshot.timestamp.desc()).first()
    current_inventory = float(latest_eod.count) if latest_eod else 0.0

    return run_forecast_from_series(
        demand_series,
        current_inventory,
        horizon=horizon,
        safety_stock=safety_stock,
        num_samples=NUM_SAMPLES,
        product_type=product_type,
        store_name=store_name,
    )
