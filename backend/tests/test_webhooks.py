import hashlib
import hmac
import pytest
from app.services.webhook_service import WebhookService
from app.config import get_settings


def test_hmac_signature_validation(test_db):
    service = WebhookService(test_db)
    payload = b'{"action":"push","repository":{"full_name":"octocat/hello-world"}}'
    secret = get_settings().GITHUB_WEBHOOK_SECRET

    expected_sig = "sha256=" + hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()

    assert service.verify_signature(payload, expected_sig) is True
    assert service.verify_signature(payload, "sha256=invalid_signature_hex") is False
    assert service.verify_signature(payload, None) is False


@pytest.mark.asyncio
async def test_webhook_idempotency(test_db):
    service = WebhookService(test_db)
    event_id = "guid-12345-67890-test"
    payload = {
        "action": "push",
        "ref": "refs/heads/main",
        "sender": {"login": "octocat"},
        "commits": [],
    }

    # First delivery
    res1 = await service.handle_event(event_id, "push", payload)
    assert res1["status"] in ("processed", "ignored")

    # Duplicate delivery
    res2 = await service.handle_event(event_id, "push", payload)
    assert res2["status"] == "ignored"
    assert res2["reason"] == "duplicate_event_id"
