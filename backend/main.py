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

from database import engine, get_db, Base
from models import Snapshot, InventoryCount

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini client
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


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
# Gemini Vision helper
# ---------------------------------------------------------------------------

async def count_products_from_image(image_bytes: bytes, mime_type: str) -> list[dict]:
    """Send an image to Gemini Vision and return structured product counts."""
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

    text = response.text.strip()
    # Strip markdown code fences if Gemini wraps the response
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    return json.loads(text)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

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
        product_counts = await count_products_from_image(image_bytes, file.content_type)
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
