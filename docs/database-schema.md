# Database Schema & Entity Relationships

The database is built on SQLAlchemy 2.0 with strict referential integrity, foreign key cascading, and composite indexes designed for efficient time-series querying and deduplication.

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ GITHUB_INSTALLATIONS : owns
    GITHUB_INSTALLATIONS ||--o{ REPOSITORIES : provides
    REPOSITORIES ||--o{ COMMITS : contains
    REPOSITORIES ||--o{ SYNC_JOBS : tracks
    REPOSITORIES ||--o{ WEBHOOK_EVENTS : receives
    CONTRIBUTORS ||--o{ COMMITS : authored
    COMMITS ||--o{ COMMIT_BRANCHES : mapped_to

    USERS {
        int id PK
        string email UK
        string password_hash
        string role
        datetime created_at
        datetime updated_at
    }

    GITHUB_INSTALLATIONS {
        int id PK
        int user_id FK
        bigint installation_id UK
        bigint account_id
        string account_login
        string status
        datetime created_at
        datetime updated_at
    }

    REPOSITORIES {
        int id PK
        int installation_id FK
        bigint github_repository_id UK
        string owner
        string name
        string full_name UK
        string visibility
        string default_branch
        boolean is_active
        datetime last_synced_at
        string sync_status
        datetime created_at
        datetime updated_at
    }

    CONTRIBUTORS {
        int id PK
        bigint github_user_id UK
        string github_login
        string display_name
        string normalized_email UK
        string avatar_url
        datetime created_at
        datetime updated_at
    }

    COMMITS {
        int id PK
        int repository_id FK
        int contributor_id FK
        string sha
        text message
        string author_name
        string author_email
        datetime committed_at
        datetime authored_at
        boolean is_merge_commit
        string html_url
        datetime created_at
        datetime updated_at
    }

    COMMIT_BRANCHES {
        int id PK
        int commit_id FK
        string branch_name
    }

    SYNC_JOBS {
        int id PK
        int repository_id FK
        string sync_type
        string status
        datetime started_at
        datetime finished_at
        int records_processed
        string error_code
        text sanitized_error_message
        int retry_count
    }

    WEBHOOK_EVENTS {
        int id PK
        int repository_id FK
        string event_id UK
        string event_type
        string processing_status
        datetime received_at
        datetime processed_at
    }
```

## Indexes & Constraints

1. **Unique Commit Identifier**:
   - `UNIQUE (repository_id, sha)` ensures zero duplicate commits even across repeated or failed sync passes.
2. **Time-Series Query Index**:
   - `INDEX idx_commits_repo_date ON commits (repository_id, committed_at DESC)` ensures near-instantaneous date-filtered lookups and pagination.
3. **Contributor Resolution Index**:
   - `INDEX idx_commits_contributor_date ON commits (contributor_id, committed_at DESC)` optimizes contributor leaderboard queries.
4. **Webhook Deduplication**:
   - `UNIQUE (event_id)` ensures idempotent webhook delivery from GitHub.
