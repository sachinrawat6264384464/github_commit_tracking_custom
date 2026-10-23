from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.repository import Repository
from app.models.commit import Commit
from app.models.contributor import Contributor
from app.models.sync_job import SyncJob
from app.schemas.repository import (
    RepositoryCreate,
    RepositoryUpdate,
    RepositoryResponse,
    RepositoryListResponse,
    CollaboratorResponse,
)
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

    # Trigger initial sync in background with isolated session
    background_tasks.add_task(_run_isolated_repo_sync, repo.id, "full")

    return _build_repo_response(repo, db)


async def _run_isolated_repo_sync(repo_id: int, sync_type: str = "incremental", job_id: Optional[int] = None):
    from app.database import SessionLocal
    with SessionLocal() as db_session:
        repo = db_session.query(Repository).filter(Repository.id == repo_id).first()
        if repo:
            service = SyncService(db_session)
            await service.sync_repository(repo, sync_type=sync_type, job_id=job_id)


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

    background_tasks.add_task(_run_isolated_repo_sync, repo.id, sync_type, job.id)

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


@router.get("/{repository_id}/collaborators", response_model=List[CollaboratorResponse])
async def get_repository_collaborators(repository_id: int, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    client = GitHubClient()
    collaborators_map = {}

    # 1. Fetch GitHub Collaborators if permitted
    try:
        resp, _ = await client._request_with_retry("GET", f"/repos/{repo.owner}/{repo.name}/collaborators")
        if resp.status_code == 200:
            for item in resp.json():
                login = item.get("login")
                if not login:
                    continue
                perms = item.get("permissions", {})
                role = "Admin" if perms.get("admin") else ("Write" if perms.get("push") else "Read")
                collaborators_map[login.lower()] = {
                    "id": item.get("id"),
                    "login": login,
                    "avatar_url": item.get("avatar_url"),
                    "html_url": item.get("html_url"),
                    "role": role,
                    "permissions": perms,
                    "commits_count": 0,
                    "latest_commit_at": None,
                }
    except Exception as e:
        # Fallback if personal token doesn't have repo admin scope
        pass

    # 2. Correlate with commits in local database
    commits_by_contributor = (
        db.query(
            Contributor.id,
            Contributor.github_login,
            Contributor.display_name,
            Contributor.avatar_url,
            func.count(Commit.id).label("commits_count"),
            func.max(Commit.committed_at).label("latest_commit"),
        )
        .join(Commit, Commit.contributor_id == Contributor.id)
        .filter(Commit.repository_id == repository_id)
        .group_by(Contributor.id)
        .all()
    )

    for c_id, gh_login, name, avatar, c_count, max_date in commits_by_contributor:
        key = (gh_login or name or "").lower()
        if key in collaborators_map:
            collaborators_map[key]["commits_count"] = c_count
            collaborators_map[key]["latest_commit_at"] = max_date
            if not collaborators_map[key]["avatar_url"] and avatar:
                collaborators_map[key]["avatar_url"] = avatar
        else:
            # Contributor with commits who might not be directly in collaborators list
            collaborators_map[key] = {
                "id": c_id,
                "login": gh_login or name,
                "avatar_url": avatar,
                "html_url": f"https://github.com/{gh_login}" if gh_login else None,
                "role": "Contributor",
                "permissions": {"push": True, "pull": True},
                "commits_count": c_count,
                "latest_commit_at": max_date,
            }

    # Format result list sorted by commits_count (descending)
    result = [CollaboratorResponse(**val) for val in collaborators_map.values()]
    result.sort(key=lambda x: (x.commits_count, 1 if x.role == "Admin" else 0), reverse=True)
    return result
