# Requirements Document: GitHub Commit Tracking & Repository Analytics Dashboard

## 1. System Overview
The GitHub Commit Tracking & Repository Analytics Dashboard (GitPulse) is a centralized, production-ready system engineered to monitor up to 10 GitHub repositories simultaneously (with architecture built to scale to hundreds). It synchronizes historical commits, analyzes contributor velocity, records pull/push activity, detects merge commits, and provides interactive analytics across all monitored repositories.

## 2. Functional Requirements

### 2.1 GitHub Authentication & Integration
- **Dual Auth Strategies**:
  1. Personal Access Token (PAT) for rapid personal/MVP onboarding (supports fine-grained and classic tokens).
  2. GitHub App with Webhooks for organization/enterprise installs with minimal permissions (`Contents: Read-Only`, `Metadata: Read-Only`).
- **Rate Limit Resilience**: Check remaining rate limit (`X-RateLimit-Remaining`) before issuing paginated batch requests. Pause or throttle when under safety buffer (default: 50 requests).
- **Transient Failure Handling**: Implement exponential backoff retry for HTTP 429, 500, 502, 503, 504.
- **Empty / Inaccessible Repos**: Gracefully handle 404/403 errors, empty branches without commits, and renamed/archived repositories.

### 2.2 Repository Management
- Register and track up to 10 active repositories simultaneously.
- Support both public and authorized private repositories.
- Display metadata: owner, name, full name, GitHub ID, visibility (public/private), default branch, and real-time synchronization status.
- Allow adding, removing, enabling/disabling sync, and triggering on-demand manual resync.

### 2.3 Commit & Contributor Synchronization
- **Commit Ingestion**:
  - Fetch SHA, message, author name, author email, GitHub user login, commit timestamp, authored timestamp, merge commit status, HTML URL.
  - Deduplicate on `(repository_id, sha)`.
  - Date-based incremental sync to only pull new commits after `last_synced_at`.
  - Configurable inclusion of merge commits in analytical aggregations.
- **Contributor Identity Resolution**:
  - Maintain canonical contributor profiles keyed by `github_user_id` when available.
  - Fall back to normalized email/name matching when GitHub profile is unlinked.
  - Avoid conflating contributors with identical display names who have distinct emails/IDs.

### 2.4 Webhooks & Real-Time Sync
- Provide an endpoint `/api/v1/webhooks/github` that validates incoming HMAC SHA-256 signatures against `GITHUB_WEBHOOK_SECRET`.
- Idempotently handle `push` events and queue background reconciliation.

### 2.5 Analytics Engine
- Aggregate daily, weekly, and monthly commit metrics.
- Compute repository activity share, contributor leaderboard, and heatmaps.
- Configurable date range filtering (7d, 30d, 90d, custom).
- Global cross-repository commit explorer with search and server-side pagination.

## 3. Non-Functional Requirements
- **Performance**: Sub-100ms API response time on indexed queries; client-side bundle size optimized; responsive tables with pagination.
- **Security**:
  - No credentials, tokens, or webhook secrets exposed in client bundles or public API responses.
  - SQL injection prevention via SQLAlchemy 2 parameterized queries.
  - Strict CORS origin allowlists.
  - Constant-time HMAC comparison for webhook signatures.
- **Reliability & Portability**: Runs seamlessly on local Windows/Linux development environments with SQLite fallback and full PostgreSQL production readiness.
