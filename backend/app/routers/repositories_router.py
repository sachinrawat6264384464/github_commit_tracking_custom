from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.repository import Repository
from app.models.commit import Commit
from app.models.contributor import Contributor
from app.models.sync_job import SyncJob
from app.schemas.repository import RepositoryCreate, RepositoryUpdate, RepositoryResponse, RepositoryListResponse
from app.schemas.commit import CommitResponse, CommitListResponse
from app.schemas.contributor import ContributorResponse
from app.schemas.sync import SyncTriggerResponse
from app.services.github_client import GitHubClient, GitHubAPIException
from app.services.sync_service import SyncService

router = APIRouter(prefix="/api/v1/repositories", tags=["Repositories"])


def _build_repo_response(repo: Repository, db: Session) -> RepositoryResponse:
    total_commits = db.query(func.count(Commit.id)).filter(Commit.repository_id == repo.id).scalar() or 0
    total_contributors = (
        db.query(func.count(func.distinct(Commit.contributor_id)))
        .filter(Commit.repository_id == repo.id, Commit.contributor_id.isnot(None))
        .scalar()
        or 0
    )
    latest_commit_at = (
        db.query(func.max(Commit.committed_at))
        .filter(Commit.repository_id == repo.id)
        .scalar()
    )

    return RepositoryResponse(
        id=repo.id,
        github_repository_id=repo.github_repository_id,
        owner=repo.owner,
        name=repo.name,
        full_name=repo.full_name,
        visibility=repo.visibility,
        default_branch=repo.default_branch,
        is_active=repo.is_active,
        last_synced_at=repo.last_synced_at,
        sync_status=repo.sync_status,
        html_url=repo.html_url or f"https://github.com/{repo.full_name}",
        description=repo.description,
        created_at=repo.created_at,
        updated_at=repo.updated_at,
        total_commits=total_commits,
        total_contributors=total_contributors,
        latest_commit_at=latest_commit_at,
    )


@router.get("", response_model=RepositoryListResponse)
def list_repositories(db: Session = Depends(get_db)):
    repos = db.query(Repository).order_by(Repository.created_at.desc()).all()
    items = [_build_repo_response(r, db) for r in repos]
    return RepositoryListResponse(items=items, total=len(items))


@router.post("", response_model=RepositoryResponse, status_code=201)
async def register_repository(
    repo_in: RepositoryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    owner = repo_in.owner.strip()
    name = repo_in.name.strip()
    full_name = f"{owner}/{name}".lower()

    # Check 10 repositories capacity limit as requested by user
    total_existing = db.query(func.count(Repository.id)).scalar() or 0
    if total_existing >= 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum limit of 10 repositories reached for this dashboard. Remove an existing repository to add a new one.",
        )

    # Check for duplicate
    existing = db.query(Repository).filter(Repository.full_name == full_name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Repository '{full_name}' is already registered.")

    # Validate against GitHub API
    client = GitHubClient()
    try:
        details = await client.get_repository_details(owner, name)
    except GitHubAPIException as e:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to verify repository on GitHub ({owner}/{name}): {str(e)}",
        )

    repo = Repository(
        owner=details.get("owner", {}).get("login", owner),
        name=details.get("name", name),
        full_name=details.get("full_name", full_name).lower(),
        github_repository_id=details.get("id"),
        visibility="private" if details.get("private") else "public",
        default_branch=details.get("default_branch", repo_in.default_branch or "main"),
        html_url=details.get("html_url"),
        description=details.get("description"),
        sync_status="pending",
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)

    # Trigger initial sync in background
    sync_service = SyncService(db, client)
    background_tasks.add_task(sync_service.sync_repository, repo, sync_type="full")

    return _build_repo_response(repo, db)


@router.get("/{repository_id}", response_model=RepositoryResponse)
def get_repository(repository_id: int, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return _build_repo_response(repo, db)


@router.delete("/{repository_id}")
def delete_repository(repository_id: int, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    db.delete(repo)
    db.commit()
    return {"message": f"Repository '{repo.full_name}' deleted successfully."}


@router.post("/{repository_id}/sync", response_model=SyncTriggerResponse)
def trigger_repository_sync(
    repository_id: int,
    background_tasks: BackgroundTasks,
    sync_type: str = "incremental",
    db: Session = Depends(get_db),
):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    job = SyncJob(
        repository_id=repo.id,
        sync_type=sync_type,
        status="pending",
    )
    db.add(job)
    repo.sync_status = "syncing"
    db.commit()
    db.refresh(job)

    sync_service = SyncService(db)
    background_tasks.add_task(sync_service.sync_repository, repo, sync_type=sync_type, job_id=job.id)

    return SyncTriggerResponse(
        message=f"Sync triggered for {repo.full_name}",
        job_id=job.id,
        repository_id=repo.id,
        sync_type=sync_type,
        status="pending",
    )


@router.get("/{repository_id}/commits", response_model=CommitListResponse)
def get_repository_commits(
    repository_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    query = db.query(Commit).filter(Commit.repository_id == repository_id)
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            (Commit.message.ilike(search_filter)) | (Commit.author_name.ilike(search_filter)) | (Commit.sha.ilike(search_filter))
        )

    total = query.count()
    commits = (
        query.order_by(Commit.committed_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        CommitResponse(
            id=c.id,
            repository_id=c.repository_id,
            repository_name=repo.name,
            repository_full_name=repo.full_name,
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
            html_url=c.html_url or f"https://github.com/{repo.full_name}/commit/{c.sha}",
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
