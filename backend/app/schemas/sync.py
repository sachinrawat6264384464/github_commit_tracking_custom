import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class SyncTriggerResponse(BaseModel):
    message: str
    job_id: int
    repository_id: int
    sync_type: str
    status: str


class SyncAllResponse(BaseModel):
    message: str
    triggered_jobs: List[int]
    total_repositories: int


class SyncJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    repository_id: int
    repository_name: Optional[str] = None
    sync_type: str
    status: str
    started_at: datetime.datetime
    finished_at: Optional[datetime.datetime] = None
    records_processed: int
    error_code: Optional[str] = None
    sanitized_error_message: Optional[str] = None
    retry_count: int


class GitHubStatusResponse(BaseModel):
    authenticated: bool
    mode: str  # "token", "github_app", or "unauthenticated"
    rate_limit_limit: int
    rate_limit_remaining: int
    rate_limit_reset: Optional[datetime.datetime] = None
    user_or_app_login: Optional[str] = None
