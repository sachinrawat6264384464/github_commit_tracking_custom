import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, BigInteger, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    github_repository_id = Column(BigInteger, unique=True, index=True, nullable=True)
    installation_id = Column(Integer, ForeignKey("github_installations.id", ondelete="SET NULL"), nullable=True)
    owner = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    full_name = Column(String(510), unique=True, index=True, nullable=False)
    visibility = Column(String(50), default="public", nullable=False)
    default_branch = Column(String(255), default="main", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_synced_at = Column(DateTime, nullable=True)
    sync_status = Column(String(50), default="pending", nullable=False)  # pending, syncing, synced, failed
    html_url = Column(String(510), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    commits = relationship("Commit", back_populates="repository", cascade="all, delete-orphan")
    sync_jobs = relationship("SyncJob", back_populates="repository", cascade="all, delete-orphan")
    webhook_events = relationship("WebhookEvent", back_populates="repository", cascade="all, delete-orphan")
