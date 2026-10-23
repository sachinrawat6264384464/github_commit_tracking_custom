import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Commit(Base):
    __tablename__ = "commits"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    contributor_id = Column(Integer, ForeignKey("contributors.id", ondelete="SET NULL"), nullable=True, index=True)
    sha = Column(String(64), nullable=False, index=True)
    message = Column(Text, nullable=False)
    author_name = Column(String(255), nullable=False)
    author_email = Column(String(255), nullable=True)
    committed_at = Column(DateTime, nullable=False, index=True)
    authored_at = Column(DateTime, nullable=True)
    is_merge_commit = Column(Boolean, default=False, nullable=False, index=True)
    html_url = Column(String(510), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    repository = relationship("Repository", back_populates="commits")
    contributor = relationship("Contributor", back_populates="commits")
    branches = relationship("CommitBranch", back_populates="commit", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("repository_id", "sha", name="uq_repository_commit_sha"),
        Index("idx_commits_repo_committed", "repository_id", "committed_at"),
        Index("idx_commits_contrib_committed", "contributor_id", "committed_at"),
    )


class CommitBranch(Base):
    __tablename__ = "commit_branches"

    id = Column(Integer, primary_key=True, index=True)
    commit_id = Column(Integer, ForeignKey("commits.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_name = Column(String(255), nullable=False, index=True)

    commit = relationship("Commit", back_populates="branches")

    __table_args__ = (
        UniqueConstraint("commit_id", "branch_name", name="uq_commit_branch"),
    )
