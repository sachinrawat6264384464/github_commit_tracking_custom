from app.routers.github_router import router as github_router
from app.routers.repositories_router import router as repositories_router
from app.routers.commits_router import router as commits_router
from app.routers.contributors_router import router as contributors_router
from app.routers.analytics_router import router as analytics_router
from app.routers.sync_router import router as sync_router
from app.routers.webhooks_router import router as webhooks_router

__all__ = [
    "github_router",
    "repositories_router",
    "commits_router",
    "contributors_router",
    "analytics_router",
    "sync_router",
    "webhooks_router",
]
