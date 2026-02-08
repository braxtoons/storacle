from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class Snapshot(Base):
    __tablename__ = "snapshots"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    time_of_day = Column(String, nullable=False)  # "AM" or "EOD"
    store_name = Column(String, nullable=False, default="default")

    counts = relationship("InventoryCount", back_populates="snapshot")


class InventoryCount(Base):
    __tablename__ = "inventory_counts"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("snapshots.id"), nullable=False)
    product_type = Column(String, nullable=False)
    count = Column(Integer, nullable=False)

    snapshot = relationship("Snapshot", back_populates="counts")


class GeminiSpend(Base):
    __tablename__ = "gemini_spend"

    id = Column(Integer, primary_key=True, default=1)
    total_usd = Column(Float, nullable=False, default=0.0)
    total_input_tokens = Column(Integer, nullable=False, default=0)
    total_output_tokens = Column(Integer, nullable=False, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)
