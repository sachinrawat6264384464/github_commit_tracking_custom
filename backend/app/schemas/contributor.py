import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict


class ContributorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    github_user_id: Optional[int] = None
    github_login: Optional[str] = None
    display_name: str
    normalized_email: Optional[str] = None
    avatar_url: Optional[str] = None
    total_commits: int = 0
    repositories_contributed: int = 0
    first_commit_at: Optional[datetime.datetime] = None
    last_commit_at: Optional[datetime.datetime] = None
    repo_breakdown: Optional[Dict[str, int]] = None


class ContributorListResponse(BaseModel):
    items: List[ContributorResponse]
    total: int
