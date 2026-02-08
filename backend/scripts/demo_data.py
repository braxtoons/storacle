#!/usr/bin/env python3
"""
Generate demo data for a given store to power the Inventory countdown and
Suggested reorder tiles. Also sets the snapshot feed image to magic-shelf.png.

Usage (run from backend directory, with venv activated if needed):
    python3 scripts/demo_data.py [store_name]

Examples:
    python3 scripts/demo_data.py default
    python3 scripts/demo_data.py "My Store"

If no store name is given, uses "default". Creates the store if it doesn't exist.
Clears existing snapshots for that store before generating new data.

Make sure to select the same store in the app sidebar to see the demo data.
"""
import argparse
import random
import shutil
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Run from backend so imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import engine, SessionLocal, Base
from models import Store, Snapshot, InventoryCount

# Path to demo image (relative to project root)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
MAGIC_SHELF_PATH = PROJECT_ROOT / "resources" / "demo" / "magic-shelf.png"

# Grocery products for demo; each assigned a stock level scenario
PRODUCT_TYPES = [
    "canned_beans",
    "canned_tomatoes",
    "soup",
    "cereal",
    "milk",
    "bread",
    "eggs",
    "rice",
    "pasta",
    "yogurt",
    "oatmeal",
    "juice",
]
NUM_DAYS = 25
TYPICAL_DAILY_DEMAND = 4  # Used to keep last-day demand sane when overriding

# (product_type, (eod_min, eod_max)) - final inventory ranges per scenario
SCENARIO_RANGES = {
    "critical": (1, 3),    # red - Restock by [date]
    "low": (8, 12),        # amber - Low in ~X days
    "medium": (35, 50),    # green - OK, comfortable stock
    "plenty": (65, 90),    # green - full circle, no worry
}
PRODUCT_SCENARIOS = {
    "canned_beans": "critical",
    "milk": "critical",
    "canned_tomatoes": "low",
    "bread": "low",
    "soup": "medium",
    "eggs": "medium",
    "yogurt": "medium",
    "cereal": "plenty",
    "rice": "plenty",
    "pasta": "plenty",
    "oatmeal": "plenty",
    "juice": "plenty",
}


def main():
    parser = argparse.ArgumentParser(description="Generate demo data for a store")
    parser.add_argument(
        "store",
        nargs="?",
        default="default",
        help="Store name to generate data for (default: default)",
    )
    args = parser.parse_args()
    store_name = args.store.strip()
    if not store_name:
        print("Error: Store name cannot be empty")
        sys.exit(1)

    # Ensure magic-shelf.png exists
    if not MAGIC_SHELF_PATH.exists():
        print(f"Error: Demo image not found at {MAGIC_SHELF_PATH}")
        sys.exit(1)

    Base.metadata.create_all(bind=engine)
    uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
    snap_dir = uploads_dir / "snapshots"
    snap_dir.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        # Ensure store exists
        store = db.query(Store).filter(Store.name == store_name).first()
        if not store:
            db.add(Store(name=store_name))
            db.commit()
            print(f"Created store '{store_name}'")

        # Clear existing snapshots for this store
        snapshot_ids = [
            s.id for s in db.query(Snapshot.id).filter(Snapshot.store_name == store_name).all()
        ]
        if snapshot_ids:
            db.query(InventoryCount).filter(
                InventoryCount.snapshot_id.in_(snapshot_ids)
            ).delete(synchronize_session=False)
            db.query(Snapshot).filter(Snapshot.store_name == store_name).delete(
                synchronize_session=False
            )
            db.commit()
            print(f"Cleared existing snapshots and inventory for '{store_name}'")

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        base_date = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=NUM_DAYS)

        snapshots_created = 0
        counts_created = 0
        latest_snapshot_id = None
        last_am_snapshot_id = None

        # Vary data each run for different demo outcomes
        random.seed(int(time.time()) % (2**32))

        eod_stock = {pt: 40 + random.randint(0, 20) for pt in PRODUCT_TYPES}

        for day in range(NUM_DAYS):
            date = base_date + timedelta(days=day)
            am_time = date.replace(hour=8, minute=0, second=0, microsecond=0)
            eod_time = date.replace(hour=18, minute=0, second=0, microsecond=0)

            # AM snapshot
            am_snap = Snapshot(
                timestamp=am_time,
                time_of_day="AM",
                store_name=store_name,
            )
            db.add(am_snap)
            db.flush()
            last_am_snapshot_id = am_snap.id
            snapshots_created += 1
            for pt in PRODUCT_TYPES:
                db.add(
                    InventoryCount(
                        snapshot_id=am_snap.id,
                        product_type=pt,
                        count=eod_stock[pt],
                        confidence_score="high",
                        units="units",
                    )
                )
                counts_created += 1

            demand = {
                pt: max(0, int(4 + random.gauss(0, 1.5)))
                for pt in PRODUCT_TYPES
            }
            for pt in PRODUCT_TYPES:
                eod_stock[pt] = max(0, eod_stock[pt] - demand[pt])
                if eod_stock[pt] < 5:
                    eod_stock[pt] += 30 + random.randint(0, 15)

            # EOD snapshot (this becomes the most recent when we process last day)
            eod_snap = Snapshot(
                timestamp=eod_time,
                time_of_day="EOD",
                store_name=store_name,
            )
            db.add(eod_snap)
            db.flush()
            latest_snapshot_id = eod_snap.id
            snapshots_created += 1
            for pt in PRODUCT_TYPES:
                db.add(
                    InventoryCount(
                        snapshot_id=eod_snap.id,
                        product_type=pt,
                        count=eod_stock[pt],
                        confidence_score="high",
                        units="units",
                    )
                )
                counts_created += 1

        # Override last AM and EOD to demo different scenarios. Must set BOTH so
        # last-day demand (AM - EOD) stays sane (~4 units); current_inventory = EOD.
        demo_eod = {}
        for pt in PRODUCT_TYPES:
            scenario = PRODUCT_SCENARIOS.get(pt, "medium")
            lo, hi = SCENARIO_RANGES[scenario]
            demo_eod[pt] = random.randint(lo, hi)
        demo_am = {pt: count + TYPICAL_DAILY_DEMAND for pt, count in demo_eod.items()}

        for snapshot_id in (last_am_snapshot_id, latest_snapshot_id):
            counts_map = demo_am if snapshot_id == last_am_snapshot_id else demo_eod
            for ic in db.query(InventoryCount).filter(
                InventoryCount.snapshot_id == snapshot_id
            ).all():
                if ic.product_type in counts_map:
                    ic.count = counts_map[ic.product_type]

        db.commit()

        # Set magic-shelf.png as the image for the most recent snapshot (snapshot feed)
        if latest_snapshot_id:
            dest = snap_dir / f"{latest_snapshot_id}.png"
            shutil.copy2(MAGIC_SHELF_PATH, dest)
            latest = db.query(Snapshot).filter(Snapshot.id == latest_snapshot_id).first()
            if latest:
                latest.image_path = f"snapshots/{latest_snapshot_id}.png"
                db.commit()
                print(f"Set snapshot feed image to magic-shelf.png (snapshot #{latest_snapshot_id})")

        print(
            f"Generated {snapshots_created} snapshots and {counts_created} inventory counts "
            f"for store '{store_name}' ({NUM_DAYS} days × AM/EOD × {len(PRODUCT_TYPES)} products)."
        )
        print("Inventory countdown and Suggested reorder tiles should now be functional.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
