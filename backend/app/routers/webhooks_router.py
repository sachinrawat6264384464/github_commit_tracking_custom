import json
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.webhook_service import WebhookService

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])


@router.post("/github")
async def receive_github_webhook(
    request: Request,
    x_github_delivery: str = Header(..., alias="X-GitHub-Delivery"),
    x_github_event: str = Header(..., alias="X-GitHub-Event"),
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
    db: Session = Depends(get_db),
):
    body_bytes = await request.body()
    webhook_service = WebhookService(db)

    # Validate signature
    if not webhook_service.verify_signature(body_bytes, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid HMAC-SHA256 signature")

    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON payload")

    result = await webhook_service.handle_event(
        event_id=x_github_delivery,
        event_type=x_github_event,
        payload=payload,
    )

    return result
