import React, { useEffect, useState } from 'react';
import {
  X,
  FolderGit2,
  GitBranch,
  RefreshCw,
  ExternalLink,
  Users,
  GitCommit,
  Calendar,
  Search,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Repository, Commit, ContributorShare, CommitTrend } from '../types';
import { api } from '../lib/api';

interface RepositoryDetailModalProps {
  repo: Repository | null;
  onClose: () => void;
  onSync: () => void;
}

export const RepositoryDetailModal: React.FC<RepositoryDetailModalProps> = ({
  repo,
  onClose,
  onSync,
}) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [contributors, setContributors] = useState<ContributorShare[]>([]);
  const [trends, setTrends] = useState<CommitTrend[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (repo) {
      loadRepoDetails();
    }
  }, [repo, page, searchTerm]);

  const loadRepoDetails = async () => {
    if (!repo) return;
    try {
      setLoading(true);
      const [commitsRes, contribRes, trendsRes] = await Promise.all([
        api.getRepositoryCommits(repo.id, page, 15, searchTerm),
        api.getContributorLeaderboard(30, repo.id),
        api.getCommitTrends(14, 'daily', repo.id),
      ]);
      setCommits(commitsRes.items);
      setTotalPages(commitsRes.total_pages);
      setContributors(contribRes);
      setTrends(trendsRes.data);
    } catch (err) {
      console.error('Failed to load repo details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (!repo) return;
    try {
      setIsSyncing(true);
      await api.syncRepository(repo.id, 'incremental');
      await loadRepoDetails();
      onSync();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!repo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <FolderGit2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {repo.full_name}
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500">
                  {repo.visibility}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <GitBranch className="w-3 h-3" />
                  {repo.default_branch}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {repo.description || 'No repository description available.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>

            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Open GitHub"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Activity Chart */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                14-Day Commit History
              </span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                {repo.total_commits} Total Commits Tracked
              </span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="repoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Area type="monotone" dataKey="commits" stroke="#3b82f6" strokeWidth={2} fill="url(#repoGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Contributors Leaderboard for this Repo */}
          {contributors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Top Contributors (Last 30 Days)
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {contributors.slice(0, 4).map((c) => (
                  <div
                    key={c.contributor_id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {c.login ? `@${c.login}` : 'Unlinked author'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400">{c.commit_count} commits</span>
                      <span className="text-[10px] text-slate-400">{c.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Commits History Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Commit History
                </h3>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter commits by SHA, message..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading commits...
              </div>
            ) : commits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                No commits found matching query.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {commits.map((c) => (
                  <div key={c.id} className="p-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-white line-clamp-2">
                          {c.message.split('\n')[0]}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {c.author_name}
                          </span>
                          <span>•</span>
                          <span>{new Date(c.committed_at).toLocaleDateString()}</span>
                          {c.is_merge_commit && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-[10px] font-mono">
                              merge
                            </span>
                          )}
                        </div>
                      </div>

                      <a
                        href={c.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {c.short_sha}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
