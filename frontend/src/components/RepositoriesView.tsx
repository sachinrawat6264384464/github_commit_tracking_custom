import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  GitBranch,
} from 'lucide-react';
import { Repository, Commit } from '../types';
import { api } from '../lib/api';

interface RepositoriesViewProps {
  repositories: Repository[];
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onSelectRepo: (repo: Repository) => void;
}

export const RepositoriesView: React.FC<RepositoriesViewProps> = ({
  repositories,
  onRefresh,
  onOpenAddModal,
  onSelectRepo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = repositories.filter(
    (r) =>
      r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSync = async (e: React.MouseEvent, repo: Repository) => {
    e.stopPropagation();
    try {
      setSyncingId(repo.id);
      await api.syncRepository(repo.id, 'incremental');
      onRefresh();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setTimeout(() => setSyncingId(null), 1000);
    }
  };

  const handleDelete = async (e: React.MouseEvent, repo: Repository) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete '${repo.full_name}' and all its tracked commits?`)) {
      return;
    }
    try {
      setDeletingId(repo.id);
      await api.deleteRepository(repo.id);
      onRefresh();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Repository Explorer
            </h1>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              {repositories.length} Active
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor historical and real-time commit activity across your registered GitHub repositories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Repository</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search registered repositories by owner, name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
        />
      </div>

      {/* Repositories Table / Cards */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <FolderGit2 className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {repositories.length === 0 ? 'No repositories registered yet' : 'No matching repositories found'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {repositories.length === 0
              ? 'Connect GitHub repositories to monitor commits and contributor analytics.'
              : 'Try clearing your search query.'}
          </p>
          {repositories.length === 0 && (
            <button
              onClick={onOpenAddModal}
              className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Add First Repository
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Repository</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Commits</th>
                  <th className="py-3 px-4">Contributors</th>
                  <th className="py-3 px-4">Latest Commit</th>
                  <th className="py-3 px-4">Sync Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((repo) => {
                  const isSyncing = syncingId === repo.id || repo.sync_status === 'syncing';
                  return (
                    <tr
                      key={repo.id}
                      onClick={() => onSelectRepo(repo)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <FolderGit2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                              {repo.full_name}
                            </span>
                            <span className="ml-2 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500">
                              {repo.visibility}
                            </span>
                            {repo.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                                {repo.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                          <span>{repo.default_branch}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {repo.total_commits.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {repo.total_contributors}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {repo.latest_commit_at
                          ? new Date(repo.latest_commit_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'No commits'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            repo.sync_status === 'synced'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : repo.sync_status === 'syncing'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              repo.sync_status === 'synced'
                                ? 'bg-emerald-500'
                                : repo.sync_status === 'syncing'
                                ? 'bg-blue-500 animate-pulse'
                                : 'bg-amber-500'
                            }`}
                          ></span>
                          <span className="capitalize">{repo.sync_status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleSync(e, repo)}
                            disabled={isSyncing}
                            className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
                            title="Trigger Incremental Sync"
                          >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                          </button>

                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Open on GitHub"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <button
                            onClick={(e) => handleDelete(e, repo)}
                            disabled={deletingId === repo.id}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-40"
                            title="Delete Repository"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
