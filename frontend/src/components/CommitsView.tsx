import React, { useEffect, useState } from 'react';
import {
  GitCommit,
  Search,
  ExternalLink,
  Filter,
  Calendar,
  FolderGit2,
  GitBranch,
} from 'lucide-react';
import { Commit, Repository } from '../types';
import { api } from '../lib/api';

interface CommitsViewProps {
  repositories: Repository[];
}

export const CommitsView: React.FC<CommitsViewProps> = ({ repositories }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRepoId, setSelectedRepoId] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeMerges, setIncludeMerges] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommits();
  }, [page, selectedRepoId, includeMerges]);

  const loadCommits = async () => {
    try {
      setLoading(true);
      const res = await api.getCommits({
        repository_id: selectedRepoId,
        search: searchTerm || undefined,
        include_merges: includeMerges,
        page,
        page_size: 25,
      });
      setCommits(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error('Failed to load commits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCommits();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Global Commit Explorer
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, and audit normalized commit telemetry across all registered repositories.
          </p>
        </div>
        <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold self-start sm:self-auto">
          {total.toLocaleString()} Commits Indexed
        </span>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search commit message, author name, or SHA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Repository Dropdown */}
          <div className="w-full md:w-64">
            <select
              value={selectedRepoId || ''}
              onChange={(e) => {
                setSelectedRepoId(e.target.value ? Number(e.target.value) : undefined);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="">All Repositories ({repositories.length})</option>
              {repositories.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Filter
          </button>
        </form>

        {/* Merge Commits Inclusion Toggle */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeMerges}
              onChange={(e) => {
                setIncludeMerges(e.target.checked);
                setPage(1);
              }}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800"
            />
            <span>Include Merge Commits</span>
          </label>
          <span>Showing page {page} of {totalPages}</span>
        </div>
      </div>

      {/* Commits Table */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400 animate-pulse bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          Loading indexed commits...
        </div>
      ) : commits.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <GitCommit className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No commits found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Try adjusting your search criteria, repository filter, or trigger a sync.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Repository</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Commit Message</th>
                  <th className="py-3 px-4">SHA</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {commits.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white text-xs">
                        <FolderGit2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>{c.repository_name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {c.contributor_avatar_url ? (
                          <img
                            src={c.contributor_avatar_url}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                            {c.author_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {c.author_name}
                          </p>
                          {c.contributor_login && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              @{c.contributor_login}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-md">
                      <p className="text-xs text-slate-800 dark:text-slate-200 truncate">
                        {c.message.split('\n')[0]}
                      </p>
                      {c.is_merge_commit && (
                        <span className="inline-block mt-0.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                          merge commit
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {c.short_sha}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(c.committed_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <a
                        href={c.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        GitHub <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {commits.length > 0 ? (page - 1) * 25 + 1 : 0} to{' '}
              {Math.min(page * 25, total)} of {total} commits
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
