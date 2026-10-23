from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.contributor import Contributor
from app.models.commit import Commit
from app.models.repository import Repository
from app.schemas.contributor import ContributorResponse, ContributorListResponse
from app.schemas.commit import CommitResponse, CommitListResponse

router = APIRouter(prefix="/api/v1/contributors", tags=["Contributors"])


@router.get("", response_model=ContributorListResponse)
def list_contributors(
    repository_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Contributor)

    if repository_id:
        query = query.join(Commit, Contributor.id == Commit.contributor_id).filter(
            Commit.repository_id == repository_id
        ).distinct()

    contributors = query.all()
    items = []

    for c in contributors:
        commit_query = db.query(Commit).filter(Commit.contributor_id == c.id)
        if repository_id:
            commit_query = commit_query.filter(Commit.repository_id == repository_id)

        total_commits = commit_query.count()
        repos_count = (
            db.query(func.count(func.distinct(Commit.repository_id)))
            .filter(Commit.contributor_id == c.id)
            .scalar()
            or 0
        )
        first_commit = db.query(func.min(Commit.committed_at)).filter(Commit.contributor_id == c.id).scalar()
        last_commit = db.query(func.max(Commit.committed_at)).filter(Commit.contributor_id == c.id).scalar()

        items.append(
            ContributorResponse(
                id=c.id,
                github_user_id=c.github_user_id,
                github_login=c.github_login,
                display_name=c.display_name,
                normalized_email=c.normalized_email,
                avatar_url=c.avatar_url,
                total_commits=total_commits,
                repositories_contributed=repos_count,
                first_commit_at=first_commit,
                last_commit_at=last_commit,
            )
        )

    # Sort by total commits descending
    items.sort(key=lambda x: x.total_commits, reverse=True)
    return ContributorListResponse(items=items, total=len(items))


@router.get("/{contributor_id}/commits", response_model=CommitListResponse)
def get_contributor_commits(
    contributor_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    c = db.query(Contributor).filter(Contributor.id == contributor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contributor not found")

    query = db.query(Commit).filter(Commit.contributor_id == contributor_id)
    total = query.count()
    commits = (
        query.order_by(desc(Commit.committed_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        CommitResponse(
            id=comm.id,
            repository_id=comm.repository_id,
            repository_name=comm.repository.name,
            repository_full_name=comm.repository.full_name,
            contributor_id=c.id,
            contributor_login=c.github_login,
            contributor_avatar_url=c.avatar_url,
            sha=comm.sha,
            short_sha=comm.sha[:7],
            message=comm.message,
            author_name=comm.author_name,
            author_email=comm.author_email,
            committed_at=comm.committed_at,
            authored_at=comm.authored_at,
            is_merge_commit=comm.is_merge_commit,
            html_url=comm.html_url or f"https://github.com/{comm.repository.full_name}/commit/{comm.sha}",
        )
        for comm in commits
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return CommitListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
