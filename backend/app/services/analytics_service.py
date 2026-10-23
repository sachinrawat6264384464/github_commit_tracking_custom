import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, text

from app.models.repository import Repository
from app.models.commit import Commit
from app.models.contributor import Contributor
from app.models.sync_job import SyncJob
from app.schemas.analytics import (
    OverviewMetrics,
    CommitTrendsResponse,
    DateCommitCount,
    RepositoryShare,
    ContributorShare,
    HeatmapCell,
)


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_overview_metrics(self) -> OverviewMetrics:
        now = datetime.datetime.utcnow()
        today_start = datetime.datetime(now.year, now.month, now.day)
        seven_days_ago = now - datetime.timedelta(days=7)
        thirty_days_ago = now - datetime.timedelta(days=30)

        total_repos = self.db.query(func.count(Repository.id)).scalar() or 0
        active_repos = self.db.query(func.count(Repository.id)).filter(Repository.is_active == True).scalar() or 0
        total_commits = self.db.query(func.count(Commit.id)).scalar() or 0
        total_contributors = self.db.query(func.count(Contributor.id)).scalar() or 0

        commits_today = self.db.query(func.count(Commit.id)).filter(
            Commit.committed_at >= today_start
        ).scalar() or 0

        commits_7d = self.db.query(func.count(Commit.id)).filter(
            Commit.committed_at >= seven_days_ago
        ).scalar() or 0

        commits_30d = self.db.query(func.count(Commit.id)).filter(
            Commit.committed_at >= thirty_days_ago
        ).scalar() or 0

        last_sync = self.db.query(func.max(Repository.last_synced_at)).scalar()
        failed_jobs = self.db.query(func.count(SyncJob.id)).filter(SyncJob.status == "failed").scalar() or 0
        pending_jobs = self.db.query(func.count(SyncJob.id)).filter(SyncJob.status.in_(["pending", "running"])).scalar() or 0

        return OverviewMetrics(
            total_repositories=total_repos,
            active_repositories=active_repos,
            total_tracked_commits=total_commits,
            total_contributors=total_contributors,
            commits_today=commits_today,
            commits_last_7_days=commits_7d,
            commits_last_30_days=commits_30d,
            last_sync_time=last_sync,
            failed_sync_jobs=failed_jobs,
            pending_sync_jobs=pending_jobs,
        )

    def get_commit_trends(
        self,
        days: int = 30,
        interval: str = "daily",
        repository_id: Optional[int] = None,
        include_merges: bool = False,
    ) -> CommitTrendsResponse:
        now = datetime.datetime.utcnow()
        start_date = now - datetime.timedelta(days=days)

        filters = [Commit.committed_at >= start_date]
        if repository_id:
            filters.append(Commit.repository_id == repository_id)
        if not include_merges:
            filters.append(Commit.is_merge_commit == False)

        # Query commits in period
        commits = (
            self.db.query(Commit.committed_at)
            .filter(and_(*filters))
            .order_by(Commit.committed_at.asc())
            .all()
        )

        # Aggregate by date bucket
        counts_by_date: Dict[str, int] = {}
        for d in range(days + 1):
            cur = (start_date + datetime.timedelta(days=d)).strftime("%Y-%m-%d")
            counts_by_date[cur] = 0

        for (c_at,) in commits:
            d_str = c_at.strftime("%Y-%m-%d")
            if d_str in counts_by_date:
                counts_by_date[d_str] += 1

        data = [DateCommitCount(date=d, commits=c) for d, c in sorted(counts_by_date.items())]

        return CommitTrendsResponse(
            interval=interval,
            data=data,
            total_in_period=len(commits),
        )

    def get_repository_distribution(
        self,
        days: int = 30,
        include_merges: bool = False,
    ) -> List[RepositoryShare]:
        now = datetime.datetime.utcnow()
        start_date = now - datetime.timedelta(days=days)

        filters = [Commit.committed_at >= start_date]
        if not include_merges:
            filters.append(Commit.is_merge_commit == False)

        results = (
            self.db.query(
                Repository.id,
                Repository.name,
                Repository.full_name,
                func.count(Commit.id).label("commit_count"),
            )
            .join(Commit, Repository.id == Commit.repository_id)
            .filter(and_(*filters))
            .group_by(Repository.id, Repository.name, Repository.full_name)
            .order_by(desc("commit_count"))
            .all()
        )

        total_commits = sum(r[3] for r in results) or 1
        shares: List[RepositoryShare] = []
        for r_id, r_name, r_fullname, c_count in results:
            shares.append(
                RepositoryShare(
                    repository_id=r_id,
                    name=r_name,
                    full_name=r_fullname,
                    commit_count=c_count,
                    percentage=round((c_count / total_commits) * 100, 1),
                )
            )
        return shares

    def get_contributor_leaderboard(
        self,
        days: int = 30,
        repository_id: Optional[int] = None,
        limit: int = 10,
        include_merges: bool = False,
    ) -> List[ContributorShare]:
        now = datetime.datetime.utcnow()
        start_date = now - datetime.timedelta(days=days)

        filters = [Commit.committed_at >= start_date]
        if repository_id:
            filters.append(Commit.repository_id == repository_id)
        if not include_merges:
            filters.append(Commit.is_merge_commit == False)

        results = (
            self.db.query(
                Contributor.id,
                Contributor.display_name,
                Contributor.github_login,
                func.count(Commit.id).label("commit_count"),
            )
            .join(Commit, Contributor.id == Commit.contributor_id)
            .filter(and_(*filters))
            .group_by(Contributor.id, Contributor.display_name, Contributor.github_login)
            .order_by(desc("commit_count"))
            .limit(limit)
            .all()
        )

        total_commits = sum(r[3] for r in results) or 1
        shares: List[ContributorShare] = []
        for c_id, d_name, g_login, c_count in results:
            shares.append(
                ContributorShare(
                    contributor_id=c_id,
                    name=d_name,
                    login=g_login,
                    commit_count=c_count,
                    percentage=round((c_count / total_commits) * 100, 1),
                )
            )
        return shares

    def get_heatmap(
        self,
        days: int = 90,
        repository_id: Optional[int] = None,
    ) -> List[HeatmapCell]:
        now = datetime.datetime.utcnow()
        start_date = now - datetime.timedelta(days=days)

        filters = [Commit.committed_at >= start_date]
        if repository_id:
            filters.append(Commit.repository_id == repository_id)

        commits = (
            self.db.query(Commit.committed_at)
            .filter(and_(*filters))
            .all()
        )

        date_counts: Dict[str, int] = {}
        for d in range(days + 1):
            cur = (start_date + datetime.timedelta(days=d)).strftime("%Y-%m-%d")
            date_counts[cur] = 0

        for (c_at,) in commits:
            d_str = c_at.strftime("%Y-%m-%d")
            if d_str in date_counts:
                date_counts[d_str] += 1

        cells = []
        for date_str, count in sorted(date_counts.items()):
            dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
            cells.append(
                HeatmapCell(
                    date=date_str,
                    day_of_week=dt.weekday(),  # 0=Monday, 6=Sunday
                    commit_count=count,
                )
            )
        return cells
