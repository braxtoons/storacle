#!/usr/bin/env python3
"""
Seed the database with ~200 inventory count records (50 snapshots × 4 products)
for testing the forecaster. Creates 25 days of AM + EOD snapshots with realistic
daily demand so GET /forecast and the forecasts UI have data.

Run from the backend directory:
    python scripts/seed_forecast_data.py
"""
import random
import sys
from datetime import datetime, timedelta, timezone

# Run from backend so imports work
sys.path.insert(0, ".")

from database import SessionLocal
from models import Snapshot, InventoryCount

random.seed(42)

STORE_NAME = "default"
PRODUCT_TYPES = ["canned_beans", "canned_tomatoes", "soup", "cereal"]
# Days of history (each day = 2 snapshots: AM + EOD)
NUM_DAYS = 25
# So we get 25 * 2 = 50 snapshots and 50 * 4 = 200 inventory count rows


def main():
    db = SessionLocal()
    try:
        # Optional: uncomment to clear existing snapshots (keeps gemini_spend)
        # db.query(InventoryCount).delete()
        # db.query(Snapshot).delete()
        # db.commit()

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        base_date = (now.replace(hour=0, minute=0, second=0, microsecond=0)
                     - timedelta(days=NUM_DAYS))
        snapshots_created = 0
        counts_created = 0

        # Per-product: simulate starting EOD stock, then each day AM (same as prev EOD or +restock), then EOD = AM - demand
        eod_stock = {pt: 40 + random.randint(0, 20) for pt in PRODUCT_TYPES}

        for day in range(NUM_DAYS):
            date = base_date + timedelta(days=day)
            am_time = date.replace(hour=8, minute=0, second=0, microsecond=0)
            eod_time = date.replace(hour=18, minute=0, second=0, microsecond=0)

            # AM snapshot: stock at start of day (same as previous EOD)
            am_snap = Snapshot(
                timestamp=am_time,
                time_of_day="AM",
                store_name=STORE_NAME,
            )
            db.add(am_snap)
            db.flush()
            snapshots_created += 1
            for pt in PRODUCT_TYPES:
                db.add(
                    InventoryCount(
                        snapshot_id=am_snap.id,
                        product_type=pt,
                        count=eod_stock[pt],
                    )
                )
                counts_created += 1

            # Daily demand: 2-7 units per product with slight variation
            demand = {
                pt: max(0, int(4 + random.gauss(0, 1.5)))
                for pt in PRODUCT_TYPES
            }
            # EOD stock = AM - demand (min 0)
            for pt in PRODUCT_TYPES:
                eod_stock[pt] = max(0, eod_stock[pt] - demand[pt])
                # Occasional "restock" so we don't go to zero forever
                if eod_stock[pt] < 5:
                    eod_stock[pt] += 30 + random.randint(0, 15)

            # EOD snapshot
            eod_snap = Snapshot(
                timestamp=eod_time,
                time_of_day="EOD",
                store_name=STORE_NAME,
            )
            db.add(eod_snap)
            db.flush()
            snapshots_created += 1
            for pt in PRODUCT_TYPES:
                db.add(
                    InventoryCount(
                        snapshot_id=eod_snap.id,
                        product_type=pt,
                        count=eod_stock[pt],
                    )
                )
                counts_created += 1

        db.commit()
        print(
            f"Seeded {snapshots_created} snapshots and {counts_created} inventory counts "
            f"({NUM_DAYS} days × AM/EOD × {len(PRODUCT_TYPES)} products)."
        )
        print(
            f"Forecastable products: GET /forecast/products then GET /forecast?product_type=<name>"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
