import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="SET NULL"), nullable=True, index=True)
    event_id = Column(String(100), unique=True, index=True, nullable=False)  # X-GitHub-Delivery GUID
    event_type = Column(String(100), nullable=False, index=True)            # push, installation, etc.
    processing_status = Column(String(50), default="received", nullable=False)  # received, processed, failed, ignored
    payload_summary = Column(Text, nullable=True)
    received_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)

    repository = relationship("Repository", back_populates="webhook_events")
