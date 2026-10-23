import React, { useEffect, useState } from 'react';
import { Users, GitCommit, FolderGit2, Search, ExternalLink, X } from 'lucide-react';
import { Contributor, Commit, Repository } from '../types';
import { api } from '../lib/api';

interface ContributorsViewProps {
  repositories: Repository[];
}

export const ContributorsView: React.FC<ContributorsViewProps> = ({ repositories }) => {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepoId, setSelectedRepoId] = useState<number | undefined>(undefined);

  // Drilldown state
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);
  const [contribCommits, setContribCommits] = useState<Commit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);

  useEffect(() => {
    loadContributors();
  }, [selectedRepoId]);

  const loadContributors = async () => {
    try {
      setLoading(true);
      const res = await api.getContributors(selectedRepoId);
      setContributors(res.items);
    } catch (err) {
      console.error('Failed to load contributors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenContributor = async (c: Contributor) => {
    setSelectedContributor(c);
    try {
      setLoadingCommits(true);
      const res = await api.getContributorCommits(c.id, 1, 30);
      setContribCommits(res.items);
    } catch (err) {
      console.error('Failed to load contributor commits:', err);
    } finally {
      setLoadingCommits(false);
    }
  };

  const filtered = contributors.filter(
    (c) =>
      c.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.github_login && c.github_login.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Contributors & Authors
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track author velocity, repository participation, and cross-project contributions.
          </p>
        </div>
        <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold self-start sm:self-auto">
          {contributors.length} Unique Authors
        </span>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search authors by display name or GitHub username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedRepoId || ''}
            onChange={(e) => setSelectedRepoId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          >
            <option value="">All Monitored Repositories</option>
            {repositories.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contributor Grid Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Users className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No contributors found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ensure repositories are synced or clear search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => handleOpenContributor(c)}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500/50 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {c.avatar_url ? (
                    <img
                      src={c.avatar_url}
                      alt={c.display_name}
                      className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                      {c.display_name.charAt(0)}
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {c.display_name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {c.github_login ? `@${c.github_login}` : 'Unlinked Git Author'}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                  {c.total_commits} commits
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Participated in {c.repositories_contributed} repo(s)</span>
                {c.last_commit_at && (
                  <span>
                    Last active: {new Date(c.last_commit_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contributor Commits Drilldown Modal */}
      {selectedContributor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {selectedContributor.avatar_url ? (
                  <img
                    src={selectedContributor.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold">
                    {selectedContributor.display_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedContributor.display_name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedContributor.github_login ? `@${selectedContributor.github_login}` : 'Unlinked Git Author'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContributor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Recent Authored Commits ({contribCommits.length})
              </h4>
              {loadingCommits ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading commits...</div>
              ) : contribCommits.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No commits found.</div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                  {contribCommits.map((c) => (
                    <div key={c.id} className="p-3 text-xs flex items-center justify-between gap-3">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {c.message.split('\n')[0]}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{c.repository_name}</span>
                          <span>•</span>
                          <span>{new Date(c.committed_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <a
                        href={c.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
                      >
                        {c.short_sha} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
