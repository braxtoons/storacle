from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class Snapshot(Base):
    __tablename__ = "snapshots"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    time_of_day = Column(String, nullable=False)  # "AM" or "EOD"
    # Optional: store path or skip if you don't persist image paths
    # image_path = Column(String, nullable=True)

    counts = relationship("InventoryCount", back_populates="snapshot")


class InventoryCount(Base):
    __tablename__ = "inventory_counts"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("snapshots.id"), nullable=False)
    product_type = Column(String, nullable=False)
    count = Column(Integer, nullable=False)

    snapshot = relationship("Snapshot", back_populates="counts")
