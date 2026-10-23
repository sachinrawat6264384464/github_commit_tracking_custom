import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel


class OverviewMetrics(BaseModel):
    total_repositories: int
    active_repositories: int
    total_tracked_commits: int
    total_contributors: int
    commits_today: int
    commits_last_7_days: int
    commits_last_30_days: int
    last_sync_time: Optional[datetime.datetime] = None
    failed_sync_jobs: int
    pending_sync_jobs: int


class DateCommitCount(BaseModel):
    date: str  # YYYY-MM-DD
    commits: int


class CommitTrendsResponse(BaseModel):
    interval: str  # daily or weekly
    data: List[DateCommitCount]
    total_in_period: int


class RepositoryShare(BaseModel):
    repository_id: int
    name: str
    full_name: str
    commit_count: int
    percentage: float


class ContributorShare(BaseModel):
    contributor_id: int
    name: str
    login: Optional[str] = None
    commit_count: int
    percentage: float


class HeatmapCell(BaseModel):
    date: str
    day_of_week: int
    commit_count: int
