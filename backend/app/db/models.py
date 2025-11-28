# app/db/models.py
import uuid
from sqlalchemy import Column, String, Text, DateTime, func
from app.db.base import Base

class Room(Base):
    __tablename__ = "rooms"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    code = Column(Text, default="", nullable=False)
    language = Column(String(32), default="python", nullable=False)
    last_updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
