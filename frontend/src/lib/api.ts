import {
  Repository,
  Commit,
  Contributor,
  OverviewMetrics,
  CommitTrendsResponse,
  RepositoryShare,
  ContributorShare,
  HeatmapCell,
  SyncJob,
  GitHubStatus,
  OrganizationItem,
  CatalogRepoItem,
  Collaborator,
  BranchItem,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8001/api/v1';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `API Error: ${res.status} ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.detail) errorMsg = errData.detail;
      else if (errData.message) errorMsg = errData.message;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // GitHub Status & Organization Catalog
  getGitHubStatus: () => fetchJSON<GitHubStatus>('/github/status'),
  getOrganizations: () => fetchJSON<{ items: OrganizationItem[]; total: number }>('/github/orgs'),
  getMyRepositories: () => fetchJSON<{ items: CatalogRepoItem[]; total: number }>('/github/my-repos'),

  // Repositories
  getRepositories: () => fetchJSON<{ items: Repository[]; total: number }>('/repositories'),
  getRepository: (id: number) => fetchJSON<Repository>(`/repositories/${id}`),
  registerRepository: (owner: string, name: string) =>
    fetchJSON<Repository>('/repositories', {
      method: 'POST',
      body: JSON.stringify({ owner, name }),
    }),
  deleteRepository: (id: number) =>
    fetchJSON<{ message: string }>(`/repositories/${id}`, { method: 'DELETE' }),
  syncRepository: (id: number, type: 'incremental' | 'full' = 'incremental') =>
    fetchJSON<{ message: string; job_id: number }>(`/repositories/${id}/sync?sync_type=${type}`, {
      method: 'POST',
    }),
  getRepositoryCommits: (id: number, page = 1, pageSize = 25, search?: string) => {
    let url = `/repositories/${id}/commits?page=${page}&page_size=${pageSize}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return fetchJSON<{ items: Commit[]; total: number; page: number; total_pages: number }>(url);
  },
  getRepositoryCollaborators: (id: number) =>
    fetchJSON<Collaborator[]>(`/repositories/${id}/collaborators`),
  getRepositoryBranches: (id: number) =>
    fetchJSON<BranchItem[]>(`/repositories/${id}/branches`),

  // Commits
  getCommits: (params: {
    repository_id?: number;
    contributor_id?: number;
    search?: string;
    include_merges?: boolean;
    page?: number;
    page_size?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.repository_id) q.set('repository_id', String(params.repository_id));
    if (params.contributor_id) q.set('contributor_id', String(params.contributor_id));
    if (params.search) q.set('search', params.search);
    if (params.include_merges !== undefined) q.set('include_merges', String(params.include_merges));
    if (params.page) q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    return fetchJSON<{ items: Commit[]; total: number; page: number; total_pages: number }>(
      `/commits?${q.toString()}`
    );
  },

  // Contributors
  getContributors: (repositoryId?: number) => {
    const url = repositoryId ? `/contributors?repository_id=${repositoryId}` : '/contributors';
    return fetchJSON<{ items: Contributor[]; total: number }>(url);
  },
  getContributorCommits: (id: number, page = 1, pageSize = 25) =>
    fetchJSON<{ items: Commit[]; total: number; page: number; total_pages: number }>(
      `/contributors/${id}/commits?page=${page}&page_size=${pageSize}`
    ),

  // Analytics
  getOverview: () => fetchJSON<OverviewMetrics>('/analytics/overview'),
  getCommitTrends: (days = 30, interval = 'daily', repositoryId?: number, includeMerges = false) => {
    let url = `/analytics/commit-trends?days=${days}&interval=${interval}&include_merges=${includeMerges}`;
    if (repositoryId) url += `&repository_id=${repositoryId}`;
    return fetchJSON<CommitTrendsResponse>(url);
  },
  getRepositoryDistribution: (days = 30, includeMerges = false) =>
    fetchJSON<RepositoryShare[]>(
      `/analytics/repositories?days=${days}&include_merges=${includeMerges}`
    ),
  getContributorLeaderboard: (days = 30, repositoryId?: number, limit = 10, includeMerges = false) => {
    let url = `/analytics/contributors?days=${days}&limit=${limit}&include_merges=${includeMerges}`;
    if (repositoryId) url += `&repository_id=${repositoryId}`;
    return fetchJSON<ContributorShare[]>(url);
  },
  getHeatmap: (days = 90, repositoryId?: number) => {
    let url = `/analytics/heatmap?days=${days}`;
    if (repositoryId) url += `&repository_id=${repositoryId}`;
    return fetchJSON<HeatmapCell[]>(url);
  },

  // Sync
  syncAll: () => fetchJSON<{ message: string; triggered_jobs: number[]; total_repositories: number }>('/sync/all', { method: 'POST' }),
  getSyncJobs: (limit = 20) => fetchJSON<SyncJob[]>(`/sync/jobs?limit=${limit}`),
};
