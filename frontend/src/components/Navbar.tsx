import React from 'react';
import { GitBranch, RefreshCw, Moon, Sun, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { GitHubStatus } from '../types';

interface NavbarProps {
  githubStatus: GitHubStatus | null;
  onSyncAll: () => void;
  isSyncing: boolean;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  githubStatus,
  onSyncAll,
  isSyncing,
  darkMode,
  setDarkMode,
  activeTab,
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20">
          <GitBranch className="w-5 h-5" />
        </div>
        <div>
          <span className="font-semibold text-slate-900 dark:text-white tracking-tight">GitPulse</span>
          <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            Analytics
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* GitHub Connection Badge */}
        {githubStatus && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
            {githubStatus.authenticated ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-slate-700 dark:text-slate-200">
                  {githubStatus.user_or_app_login ? `@${githubStatus.user_or_app_login}` : 'GitHub Connected'}
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Rate: {githubStatus.rate_limit_remaining}/{githubStatus.rate_limit_limit}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-700 dark:text-amber-400">
                  Unauthenticated ({githubStatus.rate_limit_remaining} left)
                </span>
              </>
            )}
          </div>
        )}

        {/* Global Sync Button */}
        <button
          onClick={onSyncAll}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync All'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
