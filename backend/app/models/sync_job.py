import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    sync_type = Column(String(50), default="incremental", nullable=False)  # full, incremental, webhook
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, running, completed, failed
    started_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    records_processed = Column(Integer, default=0, nullable=False)
    error_code = Column(String(100), nullable=True)
    sanitized_error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)

    repository = relationship("Repository", back_populates="sync_jobs")
