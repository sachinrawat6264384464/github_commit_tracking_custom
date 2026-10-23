from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.repository import Repository
from app.models.sync_job import SyncJob
from app.schemas.sync import SyncAllResponse, SyncJobResponse
from app.services.sync_service import SyncService

router = APIRouter(prefix="/api/v1/sync", tags=["Synchronization"])


@router.post("/all", response_model=SyncAllResponse)
def sync_all_repositories(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    repos = db.query(Repository).filter(Repository.is_active == True).all()
    if not repos:
        return SyncAllResponse(
            message="No active repositories configured.",
            triggered_jobs=[],
            total_repositories=0,
        )

    sync_service = SyncService(db)
    triggered_jobs: List[int] = []

    for r in repos:
        job = SyncJob(
            repository_id=r.id,
            sync_type="incremental" if r.last_synced_at else "full",
            status="pending",
        )
        db.add(job)
        r.sync_status = "syncing"
        db.commit()
        db.refresh(job)
        triggered_jobs.append(job.id)

        background_tasks.add_task(
            sync_service.sync_repository,
            r,
            sync_type="incremental" if r.last_synced_at else "full",
            job_id=job.id,
        )

    return SyncAllResponse(
        message=f"Triggered background sync for {len(repos)} repositories.",
        triggered_jobs=triggered_jobs,
        total_repositories=len(repos),
    )


@router.get("/jobs", response_model=List[SyncJobResponse])
def list_sync_jobs(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    jobs = (
        db.query(SyncJob)
        .order_by(desc(SyncJob.started_at))
        .limit(limit)
        .all()
    )
    results = []
    for j in jobs:
        results.append(
            SyncJobResponse(
                id=j.id,
                repository_id=j.repository_id,
                repository_name=j.repository.name if j.repository else None,
                sync_type=j.sync_type,
                status=j.status,
                started_at=j.started_at,
                finished_at=j.finished_at,
                records_processed=j.records_processed,
                error_code=j.error_code,
                sanitized_error_message=j.sanitized_error_message,
                retry_count=j.retry_count,
            )
        )
    return results


@router.get("/jobs/{job_id}", response_model=SyncJobResponse)
def get_sync_job(job_id: int, db: Session = Depends(get_db)):
    j = db.query(SyncJob).filter(SyncJob.id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Sync job not found")

    return SyncJobResponse(
        id=j.id,
        repository_id=j.repository_id,
        repository_name=j.repository.name if j.repository else None,
        sync_type=j.sync_type,
        status=j.status,
        started_at=j.started_at,
        finished_at=j.finished_at,
        records_processed=j.records_processed,
        error_code=j.error_code,
        sanitized_error_message=j.sanitized_error_message,
        retry_count=j.retry_count,
    )
