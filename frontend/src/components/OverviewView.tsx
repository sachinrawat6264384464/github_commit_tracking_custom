import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  GitCommit,
  Users,
  Clock,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { OverviewMetrics, Repository, CommitTrend } from '../types';
import { api } from '../lib/api';

interface OverviewViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenAddRepo: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigateTab,
  onOpenAddRepo,
}) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [trends, setTrends] = useState<CommitTrend[]>([]);
  const [recentRepos, setRecentRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewData, trendsData, reposData] = await Promise.all([
        api.getOverview(),
        api.getCommitTrends(14, 'daily'),
        api.getRepositories(),
      ]);
      setMetrics(overviewData);
      setTrends(trendsData.data);
      setRecentRepos(reposData.items.slice(0, 4));
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Repository Performance & Commit Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Centralized commit telemetry and contributor activity across monitored repositories.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddRepo}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
          >
            + Track Repository
          </button>
        </div>
      </div>

      {/* Sync Failure Warning Banner if any */}
      {metrics && metrics.failed_sync_jobs > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {metrics.failed_sync_jobs} sync job(s) failed recently
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Review rate limits or access permissions in the Settings & Sync tab.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('settings')}
            className="text-xs font-semibold px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 transition"
          >
            Inspect Logs
          </button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Repositories
            </span>
            <FolderGit2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {metrics?.total_repositories || 0}
            </span>
            <span className="text-xs text-slate-400">/ 10 max</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {metrics?.active_repositories || 0} active sync enabled
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Commits
            </span>
            <GitCommit className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {metrics?.total_tracked_commits.toLocaleString() || 0}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              +{metrics?.commits_today || 0} today
            </span>
            <span>•</span>
            <span>+{metrics?.commits_last_7_days || 0} this week</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Contributors
            </span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {metrics?.total_contributors || 0}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Across authorized repositories
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Last Sync
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {metrics?.last_sync_time
                ? new Date(metrics.last_sync_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Never'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {metrics?.last_sync_time
              ? new Date(metrics.last_sync_time).toLocaleDateString()
              : 'Trigger a sync below'}
          </p>
        </div>
      </div>

      {/* 14-Day Commit Velocity Chart */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              14-Day Commit Activity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total volume of commits across all registered repositories
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('analytics')}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Deep Dive Analytics</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-64 w-full">
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="commitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => val.slice(5)}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="commits"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#commitGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <GitCommit className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No commit history recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Monitored Repositories Snapshot */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Monitored Repositories ({recentRepos.length}/10)
          </h2>
          <button
            onClick={() => onNavigateTab('repositories')}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>View All Repositories</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentRepos.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <FolderGit2 className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No repositories tracked yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add up to 10 GitHub repositories to monitor commits, contributor activity, and project momentum.
            </p>
            <button
              onClick={onOpenAddRepo}
              className="mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Add First Repository
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentRepos.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors bg-slate-50/50 dark:bg-slate-800/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                      {r.full_name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {r.description || 'No description provided.'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                      r.sync_status === 'synced'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : r.sync_status === 'syncing'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                    }`}
                  >
                    {r.sync_status}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-4">
                    <span>
                      <strong className="text-slate-900 dark:text-white">{r.total_commits}</strong> commits
                    </span>
                    <span>
                      <strong className="text-slate-900 dark:text-white">{r.total_contributors}</strong> contributors
                    </span>
                  </div>
                  <a
                    href={r.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    GitHub <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
