import asyncio
import logging
import random
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import httpx
from app.config import Settings, get_settings

logger = logging.getLogger("gitpulse.github_client")


class GitHubAPIException(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, error_code: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code


class GitHubClient:
    BASE_URL = "https://api.github.com"

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self.token = self.settings.GITHUB_TOKEN
        self.rate_limit_buffer = self.settings.GITHUB_API_RATE_LIMIT_BUFFER

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitPulse-Dashboard/1.0",
        }
        if self.token and self.token.strip() and self.token != "your_personal_access_token_here":
            headers["Authorization"] = f"Bearer {self.token.strip()}"
        return headers

    async def _request_with_retry(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
    ) -> Tuple[httpx.Response, Dict[str, Any]]:
        url = f"{self.BASE_URL}{endpoint}" if not endpoint.startswith("http") else endpoint
        headers = self._get_headers()

        last_exception = None
        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.request(method, url, headers=headers, params=params)

                    # Extract rate limit headers
                    rem = response.headers.get("X-RateLimit-Remaining")
                    limit = response.headers.get("X-RateLimit-Limit")
                    reset = response.headers.get("X-RateLimit-Reset")

                    rate_info = {
                        "limit": int(limit) if limit and limit.isdigit() else 60,
                        "remaining": int(rem) if rem and rem.isdigit() else 60,
                        "reset": int(reset) if reset and reset.isdigit() else int(datetime.now(timezone.utc).timestamp()) + 3600,
                    }

                    # Check for rate limit exhaustion
                    if response.status_code == 403 and "rate limit" in response.text.lower():
                        logger.warning("GitHub API rate limit hit!")
                        raise GitHubAPIException("GitHub API rate limit exceeded", status_code=403, error_code="RATE_LIMIT_EXCEEDED")

                    # Transient server errors: 500, 502, 503, 504, 429
                    if response.status_code in (429, 500, 502, 503, 504):
                        if attempt < max_retries:
                            backoff = (2 ** attempt) + random.uniform(0.1, 0.5)
                            logger.info(f"Transient error {response.status_code}. Retrying in {backoff:.2f}s...")
                            await asyncio.sleep(backoff)
                            continue
                        response.raise_for_status()

                    # Handle empty repo or not found
                    if response.status_code == 404:
                        raise GitHubAPIException(f"Resource not found: {endpoint}", status_code=404, error_code="NOT_FOUND")
                    elif response.status_code == 409:
                        # 409 Git Repository is empty
                        return response, rate_info

                    response.raise_for_status()
                    return response, rate_info

            except httpx.HTTPStatusError as e:
                last_exception = e
                if attempt == max_retries:
                    raise GitHubAPIException(f"HTTP error {e.response.status_code}: {e.response.reason_phrase}", status_code=e.response.status_code)
            except httpx.RequestError as e:
                last_exception = e
                if attempt < max_retries:
                    backoff = (2 ** attempt) + random.uniform(0.1, 0.5)
                    await asyncio.sleep(backoff)
                    continue
                raise GitHubAPIException(f"Network error connecting to GitHub: {str(e)}", error_code="NETWORK_ERROR")

        raise GitHubAPIException(f"Failed after retries: {str(last_exception)}")

    async def get_rate_limit(self) -> Dict[str, Any]:
        """Fetch current rate limit status."""
        try:
            resp, _ = await self._request_with_retry("GET", "/rate_limit")
            data = resp.json()
            core = data.get("resources", {}).get("core", {})
            reset_ts = core.get("reset")
            reset_dt = datetime.fromtimestamp(reset_ts, timezone.utc) if reset_ts else None
            return {
                "limit": core.get("limit", 60),
                "remaining": core.get("remaining", 60),
                "reset": reset_dt,
            }
        except Exception as e:
            logger.error(f"Failed to fetch rate limit: {e}")
            return {
                "limit": 60,
                "remaining": 60,
                "reset": None,
            }

    async def get_authenticated_user(self) -> Optional[Dict[str, Any]]:
        """Verify GitHub authentication and return user/app details."""
        if not self.token or not self.token.strip() or self.token == "your_personal_access_token_here":
            return None
        try:
            resp, _ = await self._request_with_retry("GET", "/user")
            return resp.json()
        except GitHubAPIException:
            return None

    async def list_user_organizations(self) -> List[Dict[str, Any]]:
        """List all organizations that the authenticated user belongs to."""
        if not self.token or not self.token.strip() or self.token == "your_personal_access_token_here":
            return []
        try:
            resp, _ = await self._request_with_retry("GET", "/user/orgs")
            return resp.json()
        except Exception as e:
            logger.error(f"Failed to fetch user organizations: {e}")
            return []

    async def list_user_repositories(self, max_repos: int = 200) -> List[Dict[str, Any]]:
        """List all repositories accessible to the authenticated user across personal and organizations."""
        if not self.token or not self.token.strip() or self.token == "your_personal_access_token_here":
            return []
        all_repos = []
        page = 1
        while len(all_repos) < max_repos:
            try:
                resp, _ = await self._request_with_retry(
                    "GET",
                    f"/user/repos?per_page=100&page={page}&sort=updated&affiliation=owner,collaborator,organization_member"
                )
                page_data = resp.json()
                if not isinstance(page_data, list) or len(page_data) == 0:
                    break
                all_repos.extend(page_data)
                if len(page_data) < 100:
                    break
                page += 1
            except Exception as e:
                logger.error(f"Failed to fetch page {page} of user repositories: {e}")
                break
        return all_repos[:max_repos]

    async def get_repository_details(self, owner: str, repo: str) -> Dict[str, Any]:
        """Fetch repository metadata."""
        resp, rate_info = await self._request_with_retry("GET", f"/repos/{owner}/{repo}")
        return resp.json()

    async def list_branches(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """Fetch list of branches for a repository."""
        try:
            resp, _ = await self._request_with_retry("GET", f"/repos/{owner}/{repo}/branches?per_page=100")
            if resp.status_code == 200:
                return resp.json()
            return []
        except Exception as e:
            logger.warning(f"Could not fetch branches for {owner}/{repo}: {e}")
            return []

    def _parse_next_link(self, link_header: Optional[str]) -> Optional[str]:
        """Parse RFC 5988 Link header for rel='next' URL."""
        if not link_header:
            return None
        match = re.search(r'<([^>]+)>;\s*rel="next"', link_header)
        return match.group(1) if match else None

    async def fetch_commits(
        self,
        owner: str,
        repo: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        max_commits: int = 500,
        per_page: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Fetch commits for a repository with pagination and rate limit protection.
        """
        all_commits: List[Dict[str, Any]] = []
        params: Dict[str, Any] = {"per_page": min(per_page, 100)}
        if since:
            params["since"] = since.isoformat()
        if until:
            params["until"] = until.isoformat()

        next_url: Optional[str] = f"/repos/{owner}/{repo}/commits"

        while next_url and len(all_commits) < max_commits:
            try:
                resp, rate_info = await self._request_with_retry(
                    "GET",
                    next_url,
                    params=params if next_url.startswith("/repos") else None,
                )

                if resp.status_code == 409 or not resp.content:
                    # Empty repository
                    break

                page_commits = resp.json()
                if not isinstance(page_commits, list) or len(page_commits) == 0:
                    break

                all_commits.extend(page_commits)

                # Check safety rate limit buffer
                if rate_info["remaining"] < self.rate_limit_buffer:
                    logger.warning(
                        f"GitHub rate limit remaining ({rate_info['remaining']}) reached buffer threshold ({self.rate_limit_buffer}). Stopping batch sync."
                    )
                    break

                # Extract pagination link
                next_url = self._parse_next_link(resp.headers.get("Link"))
                # Clear params for next page since the URL already contains them
                params = None

            except GitHubAPIException as e:
                if e.error_code == "NOT_FOUND" or e.status_code == 404:
                    logger.warning(f"Repo {owner}/{repo} not found or inaccessible")
                    break
                raise

        return all_commits[:max_commits]
