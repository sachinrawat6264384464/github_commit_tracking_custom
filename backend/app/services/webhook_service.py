import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.repository import Repository
from app.models.webhook_event import WebhookEvent
from app.services.sync_service import SyncService
from app.config import get_settings

logger = logging.getLogger("gitpulse.webhook_service")


class WebhookService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def verify_signature(self, payload_bytes: bytes, signature_header: Optional[str]) -> bool:
        """
        Validate incoming HMAC SHA-256 signature from GitHub.
        """
        secret = self.settings.GITHUB_WEBHOOK_SECRET
        if not secret:
            logger.warning("No GITHUB_WEBHOOK_SECRET configured. Skipping verification.")
            return True

        if not signature_header or not signature_header.startswith("sha256="):
            return False

        expected_sig = "sha256=" + hmac.new(
            secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(signature_header, expected_sig)

    async def handle_event(
        self,
        event_id: str,
        event_type: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Process GitHub webhook delivery idempotently.
        """
        # Deduplication check
        existing = self.db.query(WebhookEvent).filter(WebhookEvent.event_id == event_id).first()
        if existing:
            logger.info(f"Duplicate webhook event ignored: {event_id}")
            return {"status": "ignored", "reason": "duplicate_event_id"}

        # Find repository if available in payload
        repo_data = payload.get("repository", {})
        repo_full_name = repo_data.get("full_name")
        repository: Optional[Repository] = None

        if repo_full_name:
            repository = self.db.query(Repository).filter(Repository.full_name == repo_full_name).first()

        event_record = WebhookEvent(
            repository_id=repository.id if repository else None,
            event_id=event_id,
            event_type=event_type,
            processing_status="received",
            payload_summary=json.dumps({
                "action": payload.get("action"),
                "ref": payload.get("ref"),
                "sender": payload.get("sender", {}).get("login"),
                "commits_count": len(payload.get("commits", [])),
            })[:500],
            received_at=datetime.utcnow(),
        )
        self.db.add(event_record)
        self.db.commit()

        # Handle 'push' events
        if event_type == "push" and repository and repository.is_active:
            sync_service = SyncService(self.db)
            # Run incremental sync
            job = await sync_service.sync_repository(repository, sync_type="webhook")
            event_record.processing_status = "processed"
            event_record.processed_at = datetime.utcnow()
            self.db.commit()
            return {"status": "processed", "job_id": job.id}

        event_record.processing_status = "ignored"
        event_record.processed_at = datetime.utcnow()
        self.db.commit()
        return {"status": "ignored", "reason": f"unhandled_event_{event_type}"}
