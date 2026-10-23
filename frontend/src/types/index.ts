export interface Repository {
  id: number;
  github_repository_id: number | null;
  owner: string;
  name: string;
  full_name: string;
  visibility: string;
  default_branch: string;
  is_active: boolean;
  last_synced_at: string | null;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  html_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  total_commits: number;
  total_contributors: number;
  latest_commit_at: string | null;
}

export interface Commit {
  id: number;
  repository_id: number;
  repository_name: string;
  repository_full_name: string;
  contributor_id: number | null;
  contributor_login: string | null;
  contributor_avatar_url: string | null;
  sha: string;
  short_sha: string;
  message: string;
  author_name: string;
  author_email: string | null;
  committed_at: string;
  authored_at: string | null;
  is_merge_commit: boolean;
  html_url: string;
}

export interface Contributor {
  id: number;
  github_user_id: number | null;
  github_login: string | null;
  display_name: string;
  normalized_email: string | null;
  avatar_url: string | null;
  total_commits: number;
  repositories_contributed: number;
  first_commit_at: string | null;
  last_commit_at: string | null;
}

export interface OverviewMetrics {
  total_repositories: number;
  active_repositories: number;
  total_tracked_commits: number;
  total_contributors: number;
  commits_today: number;
  commits_last_7_days: number;
  commits_last_30_days: number;
  last_sync_time: string | null;
  failed_sync_jobs: number;
  pending_sync_jobs: number;
}

export interface CommitTrend {
  date: string;
  commits: number;
}

export interface CommitTrendsResponse {
  interval: string;
  data: CommitTrend[];
  total_in_period: number;
}

export interface RepositoryShare {
  repository_id: number;
  name: string;
  full_name: string;
  commit_count: number;
  percentage: number;
}

export interface ContributorShare {
  contributor_id: number;
  name: string;
  login: string | null;
  commit_count: number;
  percentage: number;
}

export interface HeatmapCell {
  date: string;
  day_of_week: number;
  commit_count: number;
}

export interface SyncJob {
  id: number;
  repository_id: number;
  repository_name: string | null;
  sync_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  finished_at: string | null;
  records_processed: number;
  error_code: string | null;
  sanitized_error_message: string | null;
  retry_count: number;
}

export interface GitHubStatus {
  authenticated: boolean;
  mode: string;
  rate_limit_limit: number;
  rate_limit_remaining: number;
  rate_limit_reset: string | null;
  user_or_app_login: string | null;
}
