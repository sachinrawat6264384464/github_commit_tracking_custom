import React, { useEffect, useState } from 'react';
import {
  Building2,
  FolderGit2,
  Lock,
  Globe,
  Search,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  GitBranch,
  Layers,
} from 'lucide-react';
import { CatalogRepoItem, OrganizationItem, Repository } from '../types';
import { api } from '../lib/api';

interface CatalogViewProps {
  onRefreshAll: () => void;
  onOpenRepoDetails: (repo: Repository) => void;
  trackedCount: number;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  onRefreshAll,
  onOpenRepoDetails,
  trackedCount,
}) => {
  const [catalogRepos, setCatalogRepos] = useState<CatalogRepoItem[]>([]);
  const [orgs, setOrgs] = useState<OrganizationItem[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reposRes, orgsRes] = await Promise.all([
        api.getMyRepositories(),
        api.getOrganizations(),
      ]);
      setCatalogRepos(reposRes.items);
      setOrgs(orgsRes.items);
    } catch (err) {
      console.error('Failed to load GitHub catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackRepo = async (repo: CatalogRepoItem) => {
    try {
      setActionLoadingId(repo.id);
      await api.registerRepository(repo.owner, repo.name);
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      alert(`Error tracking repository: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUntrackRepo = async (repo: CatalogRepoItem) => {
    if (!repo.tracked_id) return;
    if (!window.confirm(`Are you sure you want to stop tracking '${repo.full_name}'?`)) return;
    try {
      setActionLoadingId(repo.id);
      await api.deleteRepository(repo.tracked_id);
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      alert(`Error untracking repository: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewRepoDetails = async (repo: CatalogRepoItem) => {
    if (!repo.tracked_id) return;
    try {
      const fullRepo = await api.getRepository(repo.tracked_id);
      onOpenRepoDetails(fullRepo);
    } catch (err: any) {
      alert(`Error loading details: ${err.message}`);
    }
  };

  // Grouping / Owners list
  const distinctOwners = Array.from(new Set(catalogRepos.map((r) => r.owner)));

  const filteredRepos = catalogRepos.filter((r) => {
    const matchesOwner = selectedOwner === 'all' || r.owner.toLowerCase() === selectedOwner.toLowerCase();
    const matchesSearch =
      r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesOwner && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              GitHub Organizations & Repositories Catalog
            </h1>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800">
              {catalogRepos.length} Total Repositories
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse and track team repositories across your organizations (like <strong>botmartz</strong>) and personal account without typing anything.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh GitHub</span>
        </button>
      </div>

      {/* Account / Organization Filters */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button
          onClick={() => setSelectedOwner('all')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            selectedOwner === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Repositories ({catalogRepos.length})</span>
        </button>

        {distinctOwners.map((owner) => {
          const count = catalogRepos.filter((r) => r.owner === owner).length;
          const isOrg = orgs.some((o) => o.login.toLowerCase() === owner.toLowerCase());
          const isSelected = selectedOwner.toLowerCase() === owner.toLowerCase();

          return (
            <button
              key={owner}
              onClick={() => setSelectedOwner(owner)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {isOrg ? <Building2 className="w-3.5 h-3.5" /> : <FolderGit2 className="w-3.5 h-3.5" />}
              <span>{owner}</span>
              <span className="text-[10px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Filter repositories by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
        />
      </div>

      {/* Repositories Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <FolderGit2 className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No repositories found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Try choosing another organization or clearing your search term.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRepos.map((repo) => {
            const isLoading = actionLoadingId === repo.id;

            return (
              <div
                key={repo.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between bg-white dark:bg-slate-900 ${
                  repo.is_tracked
                    ? 'border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-400/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {repo.owner_type === 'Organization' ? (
                        <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      ) : (
                        <FolderGit2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                      <h3
                        className="font-bold text-sm text-slate-900 dark:text-white truncate"
                        title={repo.full_name}
                      >
                        {repo.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {repo.private ? (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
                          <Lock className="w-2.5 h-2.5" /> Private
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {repo.owner}
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 min-h-[32px]">
                    {repo.description || 'No description provided.'}
                  </p>

                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <GitBranch className="w-3 h-3 text-slate-400" />
                      {repo.default_branch}
                    </span>
                    {repo.language && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {repo.language}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-1"
                  >
                    GitHub <ExternalLink className="w-3 h-3" />
                  </a>

                  {repo.is_tracked ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewRepoDetails(repo)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition"
                      >
                        View Commits
                      </button>
                      <button
                        onClick={() => handleUntrackRepo(repo)}
                        disabled={isLoading}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Stop Tracking"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTrackRepo(repo)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Tracking...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>Track Repo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
