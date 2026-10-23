import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_

from app.database import get_db
from app.models.commit import Commit
from app.models.repository import Repository
from app.schemas.commit import CommitResponse, CommitListResponse

router = APIRouter(prefix="/api/v1/commits", tags=["Commits"])


@router.get("", response_model=CommitListResponse)
def list_commits(
    repository_id: Optional[int] = None,
    contributor_id: Optional[int] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime.date] = None,
    date_to: Optional[datetime.date] = None,
    include_merges: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Commit).join(Repository, Commit.repository_id == Repository.id)

    filters = []
    if repository_id:
        filters.append(Commit.repository_id == repository_id)
    if contributor_id:
        filters.append(Commit.contributor_id == contributor_id)
    if not include_merges:
        filters.append(Commit.is_merge_commit == False)
    if date_from:
        filters.append(Commit.committed_at >= datetime.datetime.combine(date_from, datetime.time.min))
    if date_to:
        filters.append(Commit.committed_at <= datetime.datetime.combine(date_to, datetime.time.max))
    if search:
        search_filter = f"%{search.strip()}%"
        filters.append(
            (Commit.message.ilike(search_filter))
            | (Commit.author_name.ilike(search_filter))
            | (Commit.sha.ilike(search_filter))
        )

    if filters:
        query = query.filter(and_(*filters))

    total = query.count()
    commits = (
        query.order_by(desc(Commit.committed_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        CommitResponse(
            id=c.id,
            repository_id=c.repository_id,
            repository_name=c.repository.name,
            repository_full_name=c.repository.full_name,
            contributor_id=c.contributor_id,
            contributor_login=c.contributor.github_login if c.contributor else None,
            contributor_avatar_url=c.contributor.avatar_url if c.contributor else None,
            sha=c.sha,
            short_sha=c.sha[:7],
            message=c.message,
            author_name=c.author_name,
            author_email=c.author_email,
            committed_at=c.committed_at,
            authored_at=c.authored_at,
            is_merge_commit=c.is_merge_commit,
            html_url=c.html_url or f"https://github.com/{c.repository.full_name}/commit/{c.sha}",
        )
        for c in commits
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return CommitListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{commit_id}", response_model=CommitResponse)
def get_commit(commit_id: int, db: Session = Depends(get_db)):
    c = db.query(Commit).filter(Commit.id == commit_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Commit not found")

    return CommitResponse(
        id=c.id,
        repository_id=c.repository_id,
        repository_name=c.repository.name,
        repository_full_name=c.repository.full_name,
        contributor_id=c.contributor_id,
        contributor_login=c.contributor.github_login if c.contributor else None,
        contributor_avatar_url=c.contributor.avatar_url if c.contributor else None,
        sha=c.sha,
        short_sha=c.sha[:7],
        message=c.message,
        author_name=c.author_name,
        author_email=c.author_email,
        committed_at=c.committed_at,
        authored_at=c.authored_at,
        is_merge_commit=c.is_merge_commit,
        html_url=c.html_url or f"https://github.com/{c.repository.full_name}/commit/{c.sha}",
    )
