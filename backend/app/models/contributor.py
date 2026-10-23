import datetime
from sqlalchemy import Column, Integer, String, DateTime, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base


class Contributor(Base):
    __tablename__ = "contributors"

    id = Column(Integer, primary_key=True, index=True)
    github_user_id = Column(BigInteger, unique=True, index=True, nullable=True)
    github_login = Column(String(255), index=True, nullable=True)
    display_name = Column(String(255), nullable=False, index=True)
    normalized_email = Column(String(255), unique=True, index=True, nullable=True)
    avatar_url = Column(String(510), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    commits = relationship("Commit", back_populates="contributor")
