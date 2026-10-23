from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.github_client import GitHubClient
from app.schemas.sync import GitHubStatusResponse
from app.config import get_settings

router = APIRouter(prefix="/api/v1/github", tags=["GitHub Connection"])


@router.get("/status", response_model=GitHubStatusResponse)
async def get_github_status():
    settings = get_settings()
    client = GitHubClient(settings)
    rate_info = await client.get_rate_limit()
    user_info = await client.get_authenticated_user()

    is_authenticated = bool(user_info)
    mode = "token" if is_authenticated else "unauthenticated"
    login = user_info.get("login") if user_info else None

    return GitHubStatusResponse(
        authenticated=is_authenticated,
        mode=mode,
        rate_limit_limit=rate_info.get("limit", 60),
        rate_limit_remaining=rate_info.get("remaining", 60),
        rate_limit_reset=rate_info.get("reset"),
        user_or_app_login=login,
    )


@router.get("/connect")
def get_connect_info():
    settings = get_settings()
    if settings.GITHUB_CLIENT_ID:
        oauth_url = (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={settings.GITHUB_CLIENT_ID}"
            f"&scope=repo,read:org"
        )
    else:
        oauth_url = None

    return {
        "oauth_url": oauth_url,
        "token_configured": bool(settings.GITHUB_TOKEN and settings.GITHUB_TOKEN != "your_personal_access_token_here"),
        "instructions": (
            "Provide a GitHub Personal Access Token (PAT) with read-only repository permissions "
            "in your .env file or GitHub App credentials for enterprise organizations."
        ),
    }


@router.get("/my-repos")
async def get_my_repositories():
    settings = get_settings()
    client = GitHubClient(settings)
    repos = await client.list_user_repositories(per_page=100)
    items = []
    for r in repos:
        items.append({
            "id": r.get("id"),
            "owner": r.get("owner", {}).get("login"),
            "name": r.get("name"),
            "full_name": r.get("full_name"),
            "private": r.get("private", False),
            "description": r.get("description"),
            "default_branch": r.get("default_branch", "main"),
            "html_url": r.get("html_url"),
        })
    return {"items": items, "total": len(items)}


@router.post("/disconnect")
def disconnect_github():
    return {
        "message": "To disconnect, remove the GITHUB_TOKEN or App secrets from your .env file and restart the service.",
        "status": "info",
    }
