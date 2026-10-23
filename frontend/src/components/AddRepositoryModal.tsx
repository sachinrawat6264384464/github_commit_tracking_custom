import React, { useState, useEffect } from 'react';
import { X, FolderGit2, AlertCircle, Loader2, Lock, Globe } from 'lucide-react';
import { api } from '../lib/api';

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
  currentCount: number;
}

interface MyRepoItem {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  html_url: string;
}

const SAMPLE_REPOS = [
  { owner: 'facebook', name: 'react', desc: 'The library for web and native user interfaces' },
  { owner: 'fastapi', name: 'fastapi', desc: 'FastAPI framework, high performance, easy to learn' },
  { owner: 'pallets', name: 'flask', desc: 'The Python micro framework for building web applications' },
  { owner: 'psf', name: 'requests', desc: 'A simple, yet elegant, HTTP library for Python' },
  { owner: 'octocat', name: 'Hello-World', desc: 'My first repository on GitHub' },
  { owner: 'vercel', name: 'next.js', desc: 'The React Framework for the Web' },
  { owner: 'tailwindlabs', name: 'tailwindcss', desc: 'A utility-first CSS framework for rapid UI development' },
  { owner: 'pydantic', name: 'pydantic', desc: 'Data validation using Python type hints' },
];

export const AddRepositoryModal: React.FC<AddRepositoryModalProps> = ({
  isOpen,
  onClose,
  onAdded,
  currentCount,
}) => {
  const [repoInput, setRepoInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myRepos, setMyRepos] = useState<MyRepoItem[]>([]);
  const [loadingMyRepos, setLoadingMyRepos] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMyRepos();
    }
  }, [isOpen]);

  const loadMyRepos = async () => {
    try {
      setLoadingMyRepos(true);
      const res = await api.getMyRepositories();
      setMyRepos(res.items);
    } catch (_) {
      // Ignored if token not set yet
    } finally {
      setLoadingMyRepos(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let clean = repoInput.trim();
    if (!clean) {
      setError('Please provide a repository name or URL.');
      return;
    }

    // Handle full GitHub URL: https://github.com/owner/repo
    if (clean.includes('github.com/')) {
      const parts = clean.split('github.com/')[1].split('/');
      if (parts.length >= 2) {
        clean = `${parts[0]}/${parts[1].replace('.git', '')}`;
      }
    }

    const segments = clean.split('/');
    if (segments.length !== 2 || !segments[0] || !segments[1]) {
      setError("Please use the format 'owner/repo' (e.g. 'facebook/react') or a GitHub URL.");
      return;
    }

    const [owner, name] = segments;

    try {
      setIsLoading(true);
      await api.registerRepository(owner, name);
      setRepoInput('');
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRepo = (fullName: string) => {
    setRepoInput(fullName);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Track New Repository
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tracked Repositories</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentCount} Active
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Repository Identifier or URL
            </label>
            <input
              type="text"
              placeholder="e.g. facebook/react or yourusername/yourrepo"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* User's Own Connected GitHub Repositories */}
          {myRepos.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>Your GitHub Repositories ({myRepos.length})</span>
                <span className="text-[10px] lowercase font-normal text-blue-500">Click to select</span>
              </span>
              <div className="mt-2 grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {myRepos.map((repo) => (
                  <button
                    type="button"
                    key={repo.id}
                    onClick={() => handleSelectRepo(repo.full_name)}
                    className={`text-left p-2 rounded-lg border transition flex items-center justify-between text-xs ${
                      repoInput === repo.full_name
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {repo.private ? (
                        <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {repo.full_name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {repo.default_branch}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick-add suggestions */}
          <div className="pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Popular Open Source Repositories
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {SAMPLE_REPOS.map((sample) => (
                <button
                  type="button"
                  key={`${sample.owner}/${sample.name}`}
                  onClick={() => handleSelectRepo(`${sample.owner}/${sample.name}`)}
                  className={`text-left p-2 rounded-lg border transition group ${
                    repoInput === `${sample.owner}/${sample.name}`
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {sample.owner}/{sample.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{sample.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || currentCount >= 10}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isLoading ? 'Verifying & Syncing...' : 'Add Repository'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
