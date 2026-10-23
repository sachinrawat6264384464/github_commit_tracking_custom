import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class RepositoryCreate(BaseModel):
    owner: str = Field(..., description="GitHub organization or username, e.g. 'octocat' or 'facebook'")
    name: str = Field(..., description="GitHub repository name, e.g. 'react'")
    default_branch: Optional[str] = "main"


class RepositoryUpdate(BaseModel):
    is_active: Optional[bool] = None
    default_branch: Optional[str] = None


class RepositoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    github_repository_id: Optional[int] = None
    owner: str
    name: str
    full_name: str
    visibility: str
    default_branch: str
    is_active: bool
    last_synced_at: Optional[datetime.datetime] = None
    sync_status: str
    html_url: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    # Aggregated metrics for easy card display
    total_commits: Optional[int] = 0
    total_contributors: Optional[int] = 0
    latest_commit_at: Optional[datetime.datetime] = None
    branches_count: Optional[int] = 1
    branches: Optional[List[str]] = []


class BranchResponse(BaseModel):
    name: str
    is_default: bool = False
    protected: bool = False
    commit_sha: Optional[str] = None
    commit_url: Optional[str] = None


class RepositoryListResponse(BaseModel):
    items: List[RepositoryResponse]
    total: int


class CollaboratorResponse(BaseModel):
    id: Optional[int] = None
    login: str
    avatar_url: Optional[str] = None
    html_url: Optional[str] = None
    role: str = "Contributor"
    permissions: Optional[dict] = None
    commits_count: int = 0
    latest_commit_at: Optional[datetime.datetime] = None
