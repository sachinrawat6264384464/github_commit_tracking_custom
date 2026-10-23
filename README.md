# GitPulse: GitHub Commit Tracking & Repository Analytics Dashboard

![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-emerald)
![Python 3.10+](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.14-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688)
![React / TypeScript](https://img.shields.io/badge/React-18+-61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38B2AC)
![SQLAlchemy 2.0](https://img.shields.io/badge/SQLAlchemy-2.0+-red)
![Alembic](https://img.shields.io/badge/Alembic-Migrations-orange)

A centralized, production-grade GitHub commit tracking and repository analytics dashboard that monitors up to 10 GitHub repositories from a single unified interface.

---

## Table of Contents
1. [Key Features](#key-features)
2. [Architecture Overview](#architecture-overview)
3. [Environment Configuration (.env)](#environment-configuration-env)
4. [Quick Start (Local Development)](#quick-start-local-development)
5. [Docker Compose Deployment](#docker-compose-deployment)
6. [GitHub Integration & Permissions](#github-integration--permissions)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Automated Testing](#automated-testing)
9. [Database Schema & Migrations](#database-schema--migrations)
10. [Security & Production Hardening](#security--production-hardening)
11. [Troubleshooting Guide](#troubleshooting-guide)

---

## 1. Key Features

- **Centralized Multi-Repo Monitoring**: Track up to 10 public or authorized private repositories simultaneously.
- **Historical & Incremental Synchronization**: Batch-paginated historical commit ingestion with automatic deduplication on `(repository_id, sha)`.
- **Identity Resolution**: Safely resolves commit authors using GitHub user IDs, logins, and normalized author emails.
- **Merge Commit Filtering**: Separate and toggle merge commits in velocity metrics.
- **Rate Limit Resilience**: Dynamic inspection of `X-RateLimit-Remaining` and `X-RateLimit-Reset` with exponential backoff on transient errors.
- **Real-Time Webhooks**: Cryptographically validated HMAC SHA-256 webhook listener with idempotent delivery handling.
- **Interactive Analytics**:
  - Daily & weekly commit velocity charts.
  - Repository activity distribution breakdown (pie chart).
  - Contributor activity leaderboard.
  - 90-day commit density heatmap.
  - Global searchable commit explorer with server-side pagination.
- **Dual Database Portability**: Seamless zero-friction fallback to local SQLite for instant evaluation, with full PostgreSQL production compatibility.

---

## 2. Architecture Overview

```
custome_github/
├── .env                       # Active environment configuration
├── .env.example               # Documented environment template
├── docker-compose.yml         # Multi-container orchestration (DB, API, Web)
├── docs/                      # Architectural and technical documentation
│   ├── requirements.md
│   ├── architecture.md
│   ├── database-schema.md
│   └── github-integration.md
├── backend/                   # FastAPI Backend
│   ├── app/
│   │   ├── config.py          # Pydantic v2 settings validation
│   │   ├── database.py        # SQLAlchemy 2.0 engine & session manager
│   │   ├── models/            # Normalized declarative models
│   │   ├── schemas/           # Pydantic v2 schemas
│   │   ├── services/          # GitHub REST client, sync, analytics, webhooks
│   │   ├── routers/           # Versioned REST endpoints (/api/v1)
│   │   └── main.py            # FastAPI ASGI entry point
│   ├── alembic/               # Database migration scripts
│   ├── tests/                 # Automated pytest test suite
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/                  # React + TypeScript + Tailwind CSS Frontend
    ├── src/
    │   ├── components/        # Modular dashboard views & modals
    │   ├── lib/api.ts         # Typed API client
    │   ├── types/index.ts     # TypeScript interfaces
    │   └── App.tsx            # Main application layout & state
    ├── tailwind.config.js
    └── Dockerfile
```

---

## 3. Environment Configuration (.env)

The root `.env` and `.env.example` files contain all required settings:

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL or SQLite connection string | `sqlite:///./github_dashboard.db` |
| `GITHUB_TOKEN` | Personal Access Token (PAT) for 5,000 req/hr | `ghp_...` |
| `GITHUB_WEBHOOK_SECRET` | Secret token for HMAC SHA-256 webhook validation | `gitpulse_webhook_secret_demo_key` |
| `SESSION_SECRET` | Cryptographic secret for signing session tokens | 32-char hex string |
| `BACKEND_BASE_URL` | Base URL of the backend API | `http://localhost:8000` |
| `FRONTEND_BASE_URL` | Base URL of the frontend UI | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Client-accessible API URL | `http://localhost:8000/api/v1` |
| `GITHUB_API_RATE_LIMIT_BUFFER` | Remaining calls buffer before pausing sync | `50` |
| `DEFAULT_DATE_RANGE_DAYS` | Default analytics window | `30` |

---

## 4. Quick Start (Local Development)

### Prerequisites
- Python 3.10+ (or Python 3.14)
- Node.js 18+ and npm
- Git

### Backend Setup
```bash
# 1. Activate virtual environment
.\venv\Scripts\Activate.ps1    # On Windows PowerShell
# source venv/bin/activate     # On Linux / macOS

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Apply database migrations
python -m alembic upgrade head

# 4. Start the FastAPI development server
$env:PYTHONPATH="backend"
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger documentation is available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Frontend Setup
```bash
# In a new terminal:
cd frontend
npm install
npm run dev
```
Open your browser at: [http://localhost:5173](http://localhost:5173) (or configured port).

---

## 5. Docker Compose Deployment

To run the complete production stack (PostgreSQL, FastAPI backend, and Nginx-served frontend) in isolated Docker containers:

```bash
docker compose up --build -d
```
- Dashboard UI: `http://localhost:3000`
- API & Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

---

## 6. GitHub Integration & Permissions

### Method A: Personal Access Token (PAT) - Quickest
1. Visit GitHub Settings -> Developer settings -> Personal access tokens (Fine-grained).
2. Create a token with:
   - `Contents: Read-only`
   - `Metadata: Read-only`
3. Add to `.env`: `GITHUB_TOKEN=ghp_...`
4. Instant rate limit boost to **5,000 requests/hour**.

### Method B: GitHub App & Webhooks
1. Create a GitHub App in your Organization.
2. Subscribe to event: `push`.
3. Set Webhook URL to: `https://your-domain.com/api/v1/webhooks/github`
4. Set Webhook Secret to match `GITHUB_WEBHOOK_SECRET` in `.env`.

---

## 7. API Endpoints Reference

### Health & GitHub Status
- `GET /health`: Health check and database connectivity.
- `GET /api/v1/github/status`: Auth status, mode, and rate-limit counters.

### Repositories
- `GET /api/v1/repositories`: List registered repositories with metrics.
- `POST /api/v1/repositories`: Register a new repository (validates 10-repo limit).
- `GET /api/v1/repositories/{id}`: Repository details.
- `DELETE /api/v1/repositories/{id}`: Delete repository and cascade commits.
- `POST /api/v1/repositories/{id}/sync`: Trigger on-demand sync.
- `GET /api/v1/repositories/{id}/commits`: Paginated commits for this repository.

### Commits & Contributors
- `GET /api/v1/commits`: Global searchable commit explorer with filters.
- `GET /api/v1/contributors`: Contributor leaderboard across monitored repos.
- `GET /api/v1/contributors/{id}/commits`: Commits by a specific contributor.

### Analytics
- `GET /api/v1/analytics/overview`: Overview metric cards.
- `GET /api/v1/analytics/commit-trends`: Daily/weekly time-series volume.
- `GET /api/v1/analytics/repositories`: Repository commit distribution.
- `GET /api/v1/analytics/contributors`: Top contributor velocity.
- `GET /api/v1/analytics/heatmap`: 90-day activity density.

### Webhooks & Jobs
- `POST /api/v1/webhooks/github`: HMAC-SHA256 validated webhook listener.
- `POST /api/v1/sync/all`: Trigger sync for all active repositories.
- `GET /api/v1/sync/jobs`: List recent background sync executions.

---

## 8. Automated Testing

Run the automated backend test suite:
```bash
$env:PYTHONPATH="backend"
pytest backend/tests -v
```
All 6 test suites cover model constraints, commit deduplication, analytics trends, contributor resolution, and HMAC webhook idempotency.

---

## 9. Security & Production Checklist

- [x] Secrets and credentials isolated in `.env` (never hardcoded in code or client bundles).
- [x] Constant-time HMAC comparison (`hmac.compare_digest`) for webhook verification.
- [x] Strict CORS origin validation on all API endpoints.
- [x] Input sanitization and parameterized queries via SQLAlchemy 2.0.
- [x] Sanitized error messages to avoid token leaks in logs or UI responses.
- [x] Rate limit buffers to prevent API exhaustion.
