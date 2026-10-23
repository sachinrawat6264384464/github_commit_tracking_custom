import React, { useEffect, useState } from 'react';
import {
  Settings,
  ShieldCheck,
  RefreshCw,
  Key,
  Webhook,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { GitHubStatus, SyncJob, Repository } from '../types';
import { api } from '../lib/api';

interface SettingsViewProps {
  githubStatus: GitHubStatus | null;
  repositories: Repository[];
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  githubStatus,
  repositories,
  onRefreshAll,
}) => {
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoadingJobs(true);
      const jobs = await api.getSyncJobs(15);
      setSyncJobs(jobs);
    } catch (err) {
      console.error('Failed to load sync jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncingAll(true);
      await api.syncAll();
      await loadJobs();
      onRefreshAll();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings & Synchronization
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure GitHub API connectivity, inspect rate limits, webhook endpoints, and sync audit logs.
        </p>
      </div>

      {/* GitHub Authentication Card */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              GitHub API Integration Status
            </h2>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              githubStatus?.authenticated
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
            }`}
          >
            {githubStatus?.authenticated ? 'Authenticated' : 'Unauthenticated (Public Limit)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Authorization Mode</span>
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 font-mono capitalize">
              {githubStatus?.mode || 'None'}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Rate Limit Remaining</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-lg text-slate-900 dark:text-white font-mono">
                {githubStatus?.rate_limit_remaining}
              </span>
              <span className="text-xs text-slate-400">/ {githubStatus?.rate_limit_limit} requests</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Rate Window Reset</span>
            <span className="font-medium text-xs text-slate-700 dark:text-slate-300">
              {githubStatus?.rate_limit_reset
                ? new Date(githubStatus.rate_limit_reset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'N/A'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            How to increase your rate limits:
          </p>
          <p>
            Add a personal access token (fine-grained or classic with read-only permissions) to your{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">.env</code>{' '}
            file as <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">GITHUB_TOKEN=ghp_...</code>{' '}
            to unlock <strong>5,000 requests/hour</strong>.
          </p>
        </div>
      </div>

      {/* Webhook Configuration Card */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <Webhook className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Real-time GitHub Webhook Configuration
          </h2>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p>
            Configure your GitHub repositories to send push events to GitPulse for immediate, zero-latency sync:
          </p>
          <div className="p-3 rounded-lg bg-slate-950 text-slate-200 font-mono text-xs flex items-center justify-between">
            <span>Payload URL: http://your-domain-or-ngrok.com/api/v1/webhooks/github</span>
            <span className="text-[10px] text-emerald-400">HMAC SHA-256 Validated</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Secret is managed securely via <code className="font-mono">GITHUB_WEBHOOK_SECRET</code> in your environment file.
          </p>
        </div>
      </div>

      {/* Synchronization Audit Log */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Recent Sync Jobs Audit Log
            </h2>
          </div>

          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Triggering...' : 'Resync All Repositories'}</span>
          </button>
        </div>

        {loadingJobs ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Loading sync audit history...
          </div>
        ) : syncJobs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No sync jobs run yet.</div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Job ID</th>
                  <th className="py-2.5 px-3">Repository</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Commits Ingested</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {syncJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono text-slate-500">#{job.id}</td>
                    <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {job.repository_name || `Repo #${job.repository_id}`}
                    </td>
                    <td className="py-2 px-3 capitalize text-slate-500">{job.sync_type}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                          job.status === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : job.status === 'running'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {job.status}
                      </span>
                      {job.sanitized_error_message && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                          {job.sanitized_error_message}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white font-mono">
                      {job.records_processed}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {new Date(job.started_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
