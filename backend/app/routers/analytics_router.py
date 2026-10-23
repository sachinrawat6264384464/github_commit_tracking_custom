from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    OverviewMetrics,
    CommitTrendsResponse,
    RepositoryShare,
    ContributorShare,
    HeatmapCell,
)

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


@router.get("/overview", response_model=OverviewMetrics)
def get_overview(db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    return service.get_overview_metrics()


@router.get("/commit-trends", response_model=CommitTrendsResponse)
def get_commit_trends(
    days: int = Query(30, ge=1, le=365),
    interval: str = Query("daily"),
    repository_id: Optional[int] = None,
    include_merges: bool = False,
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_commit_trends(
        days=days,
        interval=interval,
        repository_id=repository_id,
        include_merges=include_merges,
    )


@router.get("/repositories", response_model=List[RepositoryShare])
def get_repositories_distribution(
    days: int = Query(30, ge=1, le=365),
    include_merges: bool = False,
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_repository_distribution(
        days=days,
        include_merges=include_merges,
    )


@router.get("/contributors", response_model=List[ContributorShare])
def get_contributors_leaderboard(
    days: int = Query(30, ge=1, le=365),
    repository_id: Optional[int] = None,
    limit: int = Query(10, ge=1, le=50),
    include_merges: bool = False,
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_contributor_leaderboard(
        days=days,
        repository_id=repository_id,
        limit=limit,
        include_merges=include_merges,
    )


@router.get("/heatmap", response_model=List[HeatmapCell])
def get_heatmap(
    days: int = Query(90, ge=7, le=365),
    repository_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_heatmap(days=days, repository_id=repository_id)
