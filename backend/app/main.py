import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import engine, Base
from app.services.github_client import GitHubAPIException
import app.models  # Ensure all models are imported before create_all

from app.routers import (
    github_router,
    repositories_router,
    commits_router,
    contributors_router,
    analytics_router,
    sync_router,
    webhooks_router,
)

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("gitpulse.main")


async def periodic_sync_worker():
    import asyncio
    from app.models.repository import Repository
    from app.services.sync_service import SyncService
    from app.database import SessionLocal

    interval_sec = max(settings.AUTO_SYNC_INTERVAL_MINUTES * 60, 60)
    logger.info(f"Background periodic sync worker active (Interval: {settings.AUTO_SYNC_INTERVAL_MINUTES} min).")
    while True:
        try:
            await asyncio.sleep(interval_sec)
            logger.info("Running automatic scheduled repository sync...")
            with SessionLocal() as db:
                repos = db.query(Repository).filter(Repository.is_active == True).all()
                if repos:
                    sync_service = SyncService(db)
                    for r in repos:
                        try:
                            await sync_service.sync_repository(r, sync_type="incremental")
                        except Exception as e:
                            logger.error(f"Periodic sync error for {r.full_name}: {e}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Background sync worker encountered error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")

    # Launch automated periodic sync in background
    sync_task = asyncio.create_task(periodic_sync_worker())

    yield

    sync_task.cancel()
    logger.info("Application shutting down.")


app = FastAPI(
    title="GitPulse - GitHub Commit Tracking & Repository Analytics Dashboard",
    description="Centralized production-ready GitHub repository commit monitoring, contributor metrics, and time-series analytics.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
allowed_origins = list(set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
] + settings.cors_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(GitHubAPIException)
async def github_api_exception_handler(request: Request, exc: GitHubAPIException):
    return JSONResponse(
        status_code=exc.status_code or 400,
        content={
            "error": exc.error_code or "GITHUB_API_ERROR",
            "message": str(exc),
        },
    )


# Register API Routers
app.include_router(github_router)
app.include_router(repositories_router)
app.include_router(commits_router)
app.include_router(contributors_router)
app.include_router(analytics_router)
app.include_router(sync_router)
app.include_router(webhooks_router)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": "connected",
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "name": "GitPulse Analytics API",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_check": "/health",
        "version": "1.0.0",
    }
