import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { RepositoriesView } from './components/RepositoriesView';
import { CommitsView } from './components/CommitsView';
import { ContributorsView } from './components/ContributorsView';
import { AnalyticsView } from './components/AnalyticsView';
import { CatalogView } from './components/CatalogView';
import { SettingsView } from './components/SettingsView';
import { AddRepositoryModal } from './components/AddRepositoryModal';
import { RepositoryDetailModal } from './components/RepositoryDetailModal';
import { Repository, GitHubStatus } from './types';
import { api } from './lib/api';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [githubStatus, setGithubStatus] = useState<GitHubStatus | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  useEffect(() => {
    // Apply dark class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    loadGlobalData();
  }, []);

  const loadGlobalData = async () => {
    try {
      const [reposRes, statusRes] = await Promise.all([
        api.getRepositories(),
        api.getGitHubStatus(),
      ]);
      setRepositories(reposRes.items);
      setGithubStatus(statusRes);
    } catch (err) {
      console.error('Error fetching global dashboard data:', err);
    }
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncingAll(true);
      await api.syncAll();
      await loadGlobalData();
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setTimeout(() => setIsSyncingAll(false), 1500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <Navbar
        githubStatus={githubStatus}
        onSyncAll={handleSyncAll}
        isSyncing={isSyncingAll}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        activeTab={activeTab}
      />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          reposCount={repositories.length}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl">
          {activeTab === 'overview' && (
            <OverviewView
              onNavigateTab={setActiveTab}
              onOpenAddRepo={() => setActiveTab('catalog')}
            />
          )}

          {activeTab === 'catalog' && (
            <CatalogView
              onRefreshAll={loadGlobalData}
              onOpenRepoDetails={(r) => setSelectedRepo(r)}
              trackedCount={repositories.length}
            />
          )}

          {activeTab === 'repositories' && (
            <RepositoriesView
              repositories={repositories}
              onRefresh={loadGlobalData}
              onOpenAddModal={() => setActiveTab('catalog')}
              onSelectRepo={(r) => setSelectedRepo(r)}
            />
          )}

          {activeTab === 'commits' && (
            <CommitsView repositories={repositories} />
          )}

          {activeTab === 'contributors' && (
            <ContributorsView repositories={repositories} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView repositories={repositories} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              githubStatus={githubStatus}
              repositories={repositories}
              onRefreshAll={loadGlobalData}
            />
          )}
        </main>
      </div>

      {/* Add Repository Modal */}
      <AddRepositoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={loadGlobalData}
        currentCount={repositories.length}
      />

      {/* Repository Detail Modal */}
      <RepositoryDetailModal
        repo={selectedRepo}
        onClose={() => setSelectedRepo(null)}
        onSync={loadGlobalData}
      />
    </div>
  );
}

export default App;
