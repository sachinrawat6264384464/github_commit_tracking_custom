import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CommitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    repository_id: int
    repository_name: Optional[str] = None
    repository_full_name: Optional[str] = None
    contributor_id: Optional[int] = None
    contributor_login: Optional[str] = None
    contributor_avatar_url: Optional[str] = None
    sha: str
    short_sha: str
    message: str
    author_name: str
    author_email: Optional[str] = None
    committed_at: datetime.datetime
    authored_at: Optional[datetime.datetime] = None
    is_merge_commit: bool
    html_url: Optional[str] = None


class CommitListResponse(BaseModel):
    items: List[CommitResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
