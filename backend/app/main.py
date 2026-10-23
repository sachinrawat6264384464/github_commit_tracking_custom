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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on application startup
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")
    yield
    logger.info("Application shutting down.")


app = FastAPI(
    title="GitPulse - GitHub Commit Tracking & Repository Analytics Dashboard",
    description="Centralized production-ready GitHub repository commit monitoring, contributor metrics, and time-series analytics.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
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
