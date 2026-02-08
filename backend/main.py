import base64
import json
import os

from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
import google.genai as genai

from database import engine, get_db, SessionLocal, Base
from models import Snapshot, InventoryCount, GeminiSpend
from forecast import run_forecast

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini client + spend config
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
GEMINI_SPEND_LIMIT = float(os.getenv("GEMINI_SPEND_LIMIT_USD", "250"))
INPUT_COST_PER_TOKEN = 0.10 / 1_000_000   # $0.10 per 1M input tokens
OUTPUT_COST_PER_TOKEN = 0.40 / 1_000_000   # $0.40 per 1M output tokens


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

    # Initialize spend row if it doesn't exist, and optionally reset
    db = SessionLocal()
    try:
        spend = db.query(GeminiSpend).filter(GeminiSpend.id == 1).first()
        if spend is None:
            db.add(GeminiSpend(id=1, total_usd=0.0, total_input_tokens=0, total_output_tokens=0))
            db.commit()
        elif os.getenv("GEMINI_SPEND_RESET") == "1":
            spend.total_usd = 0.0
            spend.total_input_tokens = 0
            spend.total_output_tokens = 0
            db.commit()
            print("Gemini spend tracker reset to $0.00")
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Response / request models
# ---------------------------------------------------------------------------

class InventoryCountResponse(BaseModel):
    product_type: str
    count: int

    class Config:
        from_attributes = True


class SnapshotResponse(BaseModel):
    snapshot_id: int
    timestamp: str
    time_of_day: str
    store_name: str
    counts: List[InventoryCountResponse]


class ManualCountInput(BaseModel):
    product_type: str
    count: int


class ManualSnapshotInput(BaseModel):
    time_of_day: str
    store_name: str = "default"
    counts: List[ManualCountInput]


class EditCountInput(BaseModel):
    product_type: str
    count: int


# ---------------------------------------------------------------------------
# Gemini Vision helper (with spend cap)
# ---------------------------------------------------------------------------

def _check_spend_limit(db: Session) -> float:
    """Return current spend. Raise 503 if limit is reached."""
    spend = db.query(GeminiSpend).filter(GeminiSpend.id == 1).first()
    current = spend.total_usd if spend else 0.0
    if current >= GEMINI_SPEND_LIMIT:
        raise HTTPException(
            status_code=503,
            detail=f"Gemini spend limit reached (${current:.4f} / ${GEMINI_SPEND_LIMIT:.0f}). API calls disabled.",
        )
    return current


def _record_spend(db: Session, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost, update the spend tracker, return the call cost."""
    cost = (input_tokens * INPUT_COST_PER_TOKEN) + (output_tokens * OUTPUT_COST_PER_TOKEN)
    spend = db.query(GeminiSpend).filter(GeminiSpend.id == 1).first()
    spend.total_usd += cost
    spend.total_input_tokens += input_tokens
    spend.total_output_tokens += output_tokens
    spend.last_updated = datetime.utcnow()
    db.commit()
    return cost


async def count_products_from_image(image_bytes: bytes, mime_type: str, db: Session) -> list[dict]:
    """Send an image to Gemini Vision and return structured product counts."""
    # Check spend before calling
    _check_spend_limit(db)

    b64_data = base64.b64encode(image_bytes).decode("utf-8")

    response = gemini_client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[
            {
                "parts": [
                    {"inline_data": {"mime_type": mime_type, "data": b64_data}},
                    {"text": (
                        "You are a retail inventory counter. "
                        "Look at this shelf photo and count every visible product by type. "
                        "Return ONLY a JSON array, no markdown, no explanation. "
                        'Format: [{"product_type": "canned_beans", "count": 12}, ...] '
                        "Use lowercase_snake_case for product_type names. "
                        "If you cannot identify products, return an empty array []."
                    )},
                ]
            }
        ],
    )

    # Track spend from usage metadata
    usage = response.usage_metadata
    if usage:
        input_tokens = getattr(usage, "prompt_token_count", None) or getattr(usage, "input_token_count", 0) or 0
        output_tokens = getattr(usage, "candidates_token_count", None) or getattr(usage, "output_token_count", 0) or 0
        cost = _record_spend(db, input_tokens, output_tokens)
        spend = db.query(GeminiSpend).filter(GeminiSpend.id == 1).first()
        print(f"Gemini call: {input_tokens} in / {output_tokens} out = ${cost:.6f} (total: ${spend.total_usd:.4f})")
    else:
        print("WARNING: Gemini response missing usage_metadata — spend not tracked for this call")

    text = response.text.strip()
    # Strip markdown code fences if Gemini wraps the response
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    raw_items = json.loads(text)
    print(f"Gemini raw response: {raw_items}")

    # Normalize keys — Gemini may use "product", "item", "name", etc.
    normalized = []
    for item in raw_items:
        product = (
            item.get("product_type")
            or item.get("product")
            or item.get("item")
            or item.get("name")
            or item.get("type")
            or "unknown"
        )
        count = item.get("count") or item.get("quantity") or item.get("number") or 0
        normalized.append({"product_type": str(product).lower().replace(" ", "_"), "count": int(count)})

    return normalized


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/spend")
def get_spend(db: Session = Depends(get_db)):
    """Check current Gemini API spend vs limit."""
    spend = db.query(GeminiSpend).filter(GeminiSpend.id == 1).first()
    return {
        "total_usd": round(spend.total_usd, 6) if spend else 0.0,
        "limit_usd": GEMINI_SPEND_LIMIT,
        "remaining_usd": round(GEMINI_SPEND_LIMIT - (spend.total_usd if spend else 0.0), 6),
        "total_input_tokens": spend.total_input_tokens if spend else 0,
        "total_output_tokens": spend.total_output_tokens if spend else 0,
        "last_updated": spend.last_updated.isoformat() if spend and spend.last_updated else None,
    }


@app.get("/snapshots")
def list_snapshots(
    store_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Snapshot).order_by(Snapshot.timestamp.desc())
    if store_name:
        query = query.filter(Snapshot.store_name == store_name)
    snapshots = query.limit(20).all()
    return [
        {
            "id": s.id,
            "timestamp": s.timestamp.isoformat() if s.timestamp else None,
            "time_of_day": s.time_of_day,
            "store_name": s.store_name,
            "counts": [
                {"product_type": c.product_type, "count": c.count}
                for c in s.counts
            ],
        }
        for s in snapshots
    ]


@app.post("/snapshots/upload", response_model=SnapshotResponse)
async def upload_snapshot(
    file: UploadFile = File(...),
    time_of_day: str = Form(...),
    store_name: str = Form("default"),
    db: Session = Depends(get_db),
):
    """Upload a shelf photo. Gemini Vision counts products and stores the results."""
    if time_of_day not in ("AM", "EOD"):
        raise HTTPException(status_code=400, detail="time_of_day must be 'AM' or 'EOD'")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    image_bytes = await file.read()

    try:
        product_counts = await count_products_from_image(image_bytes, file.content_type, db)
    except HTTPException:
        raise  # re-raise spend limit 503 as-is
    except (json.JSONDecodeError, Exception) as e:
        raise HTTPException(status_code=502, detail=f"Gemini parsing failed: {e}")

    snapshot = Snapshot(
        time_of_day=time_of_day,
        store_name=store_name,
        timestamp=datetime.utcnow(),
    )
    db.add(snapshot)
    db.flush()

    counts = []
    for item in product_counts:
        ic = InventoryCount(
            snapshot_id=snapshot.id,
            product_type=item["product_type"],
            count=item["count"],
        )
        db.add(ic)
        counts.append(ic)

    db.commit()

    return SnapshotResponse(
        snapshot_id=snapshot.id,
        timestamp=snapshot.timestamp.isoformat(),
        time_of_day=snapshot.time_of_day,
        store_name=snapshot.store_name,
        counts=[InventoryCountResponse(product_type=c.product_type, count=c.count) for c in counts],
    )


@app.post("/snapshots/manual", response_model=SnapshotResponse)
def create_manual_snapshot(
    data: ManualSnapshotInput,
    db: Session = Depends(get_db),
):
    """Manually create an inventory snapshot (no photo)."""
    if data.time_of_day not in ("AM", "EOD"):
        raise HTTPException(status_code=400, detail="time_of_day must be 'AM' or 'EOD'")

    snapshot = Snapshot(
        time_of_day=data.time_of_day,
        store_name=data.store_name,
        timestamp=datetime.utcnow(),
    )
    db.add(snapshot)
    db.flush()

    counts = []
    for item in data.counts:
        ic = InventoryCount(
            snapshot_id=snapshot.id,
            product_type=item.product_type,
            count=item.count,
        )
        db.add(ic)
        counts.append(ic)

    db.commit()

    return SnapshotResponse(
        snapshot_id=snapshot.id,
        timestamp=snapshot.timestamp.isoformat(),
        time_of_day=snapshot.time_of_day,
        store_name=snapshot.store_name,
        counts=[InventoryCountResponse(product_type=c.product_type, count=c.count) for c in counts],
    )


@app.put("/snapshots/{snapshot_id}/counts")
def edit_snapshot_counts(
    snapshot_id: int,
    updates: List[EditCountInput],
    db: Session = Depends(get_db),
):
    """Edit inventory counts on an existing snapshot (fix Gemini mistakes or update manually)."""
    snapshot = db.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    for update in updates:
        existing = (
            db.query(InventoryCount)
            .filter_by(snapshot_id=snapshot_id, product_type=update.product_type)
            .first()
        )
        if existing:
            existing.count = update.count
        else:
            db.add(InventoryCount(
                snapshot_id=snapshot_id,
                product_type=update.product_type,
                count=update.count,
            ))

    db.commit()
    return {"status": "updated", "snapshot_id": snapshot_id}


# ---------------------------------------------------------------------------
# Forecast & restock
# ---------------------------------------------------------------------------

@app.get("/forecast")
def get_forecast(
    product_type: str = Query(..., description="Product type to forecast"),
    store_name: Optional[str] = Query(None),
    horizon: int = Query(14, ge=1, le=90),
    safety_stock: float = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Forecast demand and restock date using exponential smoothing on daily demand.

    Daily demand = AM count - EOD count (units consumed per day). Returns predicted
    stock needed over the horizon, median restock date, and an 80% confidence interval
    for the restock date (earliest–latest likely restock day).
    """
    result = run_forecast(
        db,
        product_type=product_type,
        store_name=store_name,
        horizon=horizon,
        safety_stock=safety_stock,
    )
    if result is None:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Insufficient data for product '{product_type}'. "
                "Need at least 2 days with both AM and EOD snapshots."
            ),
        )
    return result
