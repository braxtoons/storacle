#!/usr/bin/env python3
"""
Test the forecasting pipeline without a database.

Uses synthetic daily demand (AM - EOD consumption) and runs the same logic
as GET /forecast. Run from the backend directory:

    python test_forecast_standalone.py

Or with venv:

    . venv/bin/activate && python test_forecast_standalone.py
"""

import sys
from datetime import datetime, timedelta, timezone
from typing import Optional

import pandas as pd

# Only use the DB-free entry point so we never touch database or models
from forecast import run_forecast_from_series

# ---------------------------------------------------------------------------
# Synthetic data: daily demand (units consumed per day)
# ---------------------------------------------------------------------------

def make_synthetic_demand(
    n_days: int = 10,
    base_demand: float = 4.0,
    noise: float = 1.0,
    start_date: Optional[datetime] = None,
) -> pd.Series:
    """Build a small demand series for testing (e.g. ~4 units/day with some noise)."""
    if start_date is None:
        start_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None) - timedelta(days=n_days)
    dates = pd.date_range(start=start_date, periods=n_days, freq="D")
    demand = base_demand + (pd.Series(range(n_days)) % 3 - 1) * noise  # slight variation
    return pd.Series(demand.values, index=dates)


def main() -> None:
    print("Building synthetic demand (10 days, ~4 units/day)...")
    demand = make_synthetic_demand(n_days=10, base_demand=4.0, noise=0.5)
    current_inventory = 25.0  # will run out in ~6 days at 4/day

    print("Running forecast (no DB)...")
    result = run_forecast_from_series(
        demand,
        current_inventory,
        horizon=14,
        safety_stock=0,
        num_samples=100,  # smaller for faster test
        product_type="canned_beans",
        store_name=None,
    )

    print("\n--- Forecast result (same shape as GET /forecast) ---\n")
    for k, v in result.items():
        if k == "predicted_demand_per_day":
            print(f"  {k}: [{v[0]:.2f}, {v[1]:.2f}, ...] ({len(v)} days)")
        else:
            print(f"  {k}: {v}")

    # Sanity checks
    assert result["current_inventory"] == 25.0
    assert result["restock_confidence_level"] is not None
    assert "restock_date_median" in result
    assert result["restock_date_low"] <= result["restock_date_median"] <= result["restock_date_high"]
    print("\nAssertions passed.")
    print("\nTo test with the API once the DB exists: GET /forecast?product_type=canned_beans&horizon=14")
    return None


if __name__ == "__main__":
    main()
    sys.exit(0)
