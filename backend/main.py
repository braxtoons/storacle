from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime

from database import engine, get_db, Base
from models import Snapshot, InventoryCount

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/snapshots")
def list_snapshots(db: Session = Depends(get_db)):
    snapshots = db.query(Snapshot).order_by(Snapshot.timestamp.desc()).limit(10).all()
    return [
        {
            "id": s.id,
            "timestamp": s.timestamp.isoformat() if s.timestamp else None,
            "time_of_day": s.time_of_day,
        }
        for s in snapshots
    ]


# Response models
class InventoryCountResponse(BaseModel):
    product_type: str
    count: int

    class Config:
        from_attributes = True


class SnapshotUploadResponse(BaseModel):
    snapshot_id: int
    timestamp: str
    time_of_day: str
    counts: List[InventoryCountResponse]


@app.post("/snapshots/upload", response_model=SnapshotUploadResponse)
async def upload_snapshot(
    file: UploadFile = File(...),
    time_of_day: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Upload an inventory snapshot image.

    Args:
        file: Image file (will be processed by Gemini Vision in future)
        time_of_day: Either "AM" or "EOD"

    Returns:
        Snapshot ID and inventory counts
    """
    # Validate time_of_day
    if time_of_day not in ["AM", "EOD"]:
        raise HTTPException(
            status_code=400,
            detail="time_of_day must be either 'AM' or 'EOD'"
        )

    # Validate file is an image
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be an image"
        )

    # Create snapshot record
    snapshot = Snapshot(time_of_day=time_of_day, timestamp=datetime.utcnow())
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)

    # TODO: Process image with Gemini Vision API
    # For now, create a placeholder inventory count
    inventory_count = InventoryCount(
        snapshot_id=snapshot.id,
        product_type="placeholder",
        count=0
    )
    db.add(inventory_count)
    db.commit()
    db.refresh(inventory_count)

    # Return response
    return SnapshotUploadResponse(
        snapshot_id=snapshot.id,
        timestamp=snapshot.timestamp.isoformat(),
        time_of_day=snapshot.time_of_day,
        counts=[
            InventoryCountResponse(
                product_type=inventory_count.product_type,
                count=inventory_count.count
            )
        ]
    )
