import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.repository import Repository
from app.models.contributor import Contributor
from app.models.commit import Commit, CommitBranch
from app.models.sync_job import SyncJob
from app.services.github_client import GitHubClient, GitHubAPIException
from app.config import get_settings

logger = logging.getLogger("gitpulse.sync_service")


class SyncService:
    def __init__(self, db: Session, client: Optional[GitHubClient] = None):
        self.db = db
        self.client = client or GitHubClient()
        self.settings = get_settings()
        self._cache_initialized = False
        self._cache_by_gh_id: Dict[int, Contributor] = {}
        self._cache_by_login: Dict[str, Contributor] = {}
        self._cache_by_email: Dict[str, Contributor] = {}

    def _init_contributor_cache(self):
        if self._cache_initialized:
            return
        contributors = self.db.query(Contributor).all()
        for c in contributors:
            if c.github_user_id:
                self._cache_by_gh_id[c.github_user_id] = c
            if c.github_login:
                self._cache_by_login[c.github_login.lower()] = c
            if c.normalized_email:
                self._cache_by_email[c.normalized_email.lower()] = c
        self._cache_initialized = True

    def _resolve_contributor(self, commit_data: Dict[str, Any]) -> Optional[Contributor]:
        """
        Safely resolve contributor identity with fast in-memory cache:
        1. By GitHub User ID
        2. By GitHub Login
        3. By normalized email
        """
        self._init_contributor_cache()

        author_gh = commit_data.get("author")  # GitHub User object
        git_author = commit_data.get("commit", {}).get("author", {})  # Git Author object

        gh_id = author_gh.get("id") if author_gh else None
        gh_login = (author_gh.get("login") or "").lower() if author_gh else None
        avatar_url = author_gh.get("avatar_url") if author_gh else None

        git_name = git_author.get("name") or gh_login or "Unknown"
        git_email = (git_author.get("email") or "").strip().lower() or None

        contributor: Optional[Contributor] = None

        # 1. Search in-memory by GitHub User ID
        if gh_id and gh_id in self._cache_by_gh_id:
            contributor = self._cache_by_gh_id[gh_id]

        # 2. Search in-memory by GitHub Login
        if not contributor and gh_login and gh_login in self._cache_by_login:
            contributor = self._cache_by_login[gh_login]

        # 3. Search in-memory by normalized email
        if not contributor and git_email and git_email in self._cache_by_email:
            contributor = self._cache_by_email[git_email]

        # If still not found, create new contributor record
        if not contributor:
            contributor = Contributor(
                github_user_id=gh_id,
                github_login=author_gh.get("login") if author_gh else None,
                display_name=git_name,
                normalized_email=git_email,
                avatar_url=avatar_url,
            )
            self.db.add(contributor)
            self.db.flush()

            # Store in in-memory cache
            if gh_id:
                self._cache_by_gh_id[gh_id] = contributor
            if gh_login:
                self._cache_by_login[gh_login] = contributor
            if git_email:
                self._cache_by_email[git_email] = contributor
        else:
            # Update details if new information is discovered
            updated = False
            if gh_id and not contributor.github_user_id:
                contributor.github_user_id = gh_id
                self._cache_by_gh_id[gh_id] = contributor
                updated = True
            if gh_login and not contributor.github_login:
                contributor.github_login = author_gh.get("login")
                self._cache_by_login[gh_login] = contributor
                updated = True
            if avatar_url and not contributor.avatar_url:
                contributor.avatar_url = avatar_url
                updated = True
            if git_name and contributor.display_name == "Unknown":
                contributor.display_name = git_name
                updated = True
            if updated:
                self.db.flush()

        return contributor

    async def sync_repository(
        self,
        repo: Repository,
        sync_type: str = "incremental",
        job_id: Optional[int] = None,
    ) -> SyncJob:
        """
        Synchronize commits for a single repository.
        """
        # Retrieve or initialize SyncJob record
        if job_id:
            job = self.db.query(SyncJob).filter(SyncJob.id == job_id).first()
        else:
            job = SyncJob(
                repository_id=repo.id,
                sync_type=sync_type,
                status="running",
                started_at=datetime.utcnow(),
            )
            self.db.add(job)
            self.db.commit()
            self.db.refresh(job)

        repo.sync_status = "syncing"
        self.db.commit()

        try:
            # Update repository metadata if needed
            try:
                repo_meta = await self.client.get_repository_details(repo.owner, repo.name)
                repo.github_repository_id = repo_meta.get("id")
                repo.visibility = "private" if repo_meta.get("private") else "public"
                repo.default_branch = repo_meta.get("default_branch", repo.default_branch or "main")
                repo.html_url = repo_meta.get("html_url")
                repo.description = repo_meta.get("description")
                self.db.flush()
            except Exception as e:
                logger.warning(f"Could not refresh repo metadata for {repo.full_name}: {e}")

            # Determine 'since' timestamp
            since_time = None
            if sync_type == "incremental" and repo.last_synced_at:
                since_time = repo.last_synced_at

            # Fetch commits from GitHub
            raw_commits = await self.client.fetch_commits(
                owner=repo.owner,
                repo=repo.name,
                since=since_time,
                max_commits=self.settings.MAX_HISTORICAL_COMMITS_PER_REPO,
            )

            # Preload existing commit SHAs for instant O(1) deduplication
            existing_shas = set(
                r[0] for r in self.db.query(Commit.sha).filter(Commit.repository_id == repo.id).all()
            )

            processed_count = 0

            for c in raw_commits:
                sha = c.get("sha")
                if not sha:
                    continue

                # Instant O(1) in-memory deduplication
                if sha in existing_shas:
                    continue
                existing_shas.add(sha)

                # Parse commit metadata
                git_commit = c.get("commit", {})
                parents = c.get("parents", [])
                is_merge = len(parents) > 1

                author_meta = git_commit.get("author", {})
                committer_meta = git_commit.get("committer", {})

                # Timestamps
                committed_date_str = committer_meta.get("date") or author_meta.get("date")
                committed_at = (
                    datetime.fromisoformat(committed_date_str.replace("Z", "+00:00")).replace(tzinfo=None)
                    if committed_date_str
                    else datetime.utcnow()
                )

                authored_date_str = author_meta.get("date")
                authored_at = (
                    datetime.fromisoformat(authored_date_str.replace("Z", "+00:00")).replace(tzinfo=None)
                    if authored_date_str
                    else None
                )

                # Contributor resolution
                contributor = self._resolve_contributor(c)

                # Author name / email
                author_name = author_meta.get("name") or (c.get("author") or {}).get("login") or "Unknown"
                author_email = author_meta.get("email")

                new_commit = Commit(
                    repository_id=repo.id,
                    contributor_id=contributor.id if contributor else None,
                    sha=sha,
                    message=git_commit.get("message", "").strip(),
                    author_name=author_name,
                    author_email=author_email,
                    committed_at=committed_at,
                    authored_at=authored_at,
                    is_merge_commit=is_merge,
                    html_url=c.get("html_url"),
                )
                self.db.add(new_commit)
                processed_count += 1

                # Commit every 50 records to release transaction locks
                if processed_count % 50 == 0:
                    self.db.commit()

            # Update repository state
            repo.last_synced_at = datetime.utcnow()
            repo.sync_status = "synced"

            # Update job state
            job.status = "completed"
            job.finished_at = datetime.utcnow()
            job.records_processed = processed_count
            self.db.commit()

            logger.info(f"Successfully synced {processed_count} commits for {repo.full_name}")
            return job

        except GitHubAPIException as e:
            self.db.rollback()
            repo.sync_status = "failed"
            job.status = "failed"
            job.finished_at = datetime.utcnow()
            job.error_code = e.error_code or "GITHUB_API_ERROR"
            # Sanitize error to never leak secrets
            job.sanitized_error_message = str(e).replace(self.settings.GITHUB_TOKEN or "dummy_token", "***")
            self.db.commit()
            logger.error(f"GitHub API Error during sync for {repo.full_name}: {job.sanitized_error_message}")
            return job

        except Exception as e:
            self.db.rollback()
            repo.sync_status = "failed"
            job.status = "failed"
            job.finished_at = datetime.utcnow()
            job.error_code = "INTERNAL_SYNC_ERROR"
            job.sanitized_error_message = f"Synchronization error: {str(e)[:200]}"
            self.db.commit()
            logger.exception(f"Unexpected error during sync for {repo.full_name}: {e}")
            return job
