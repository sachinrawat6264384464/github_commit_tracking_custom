import React, { useEffect, useState } from 'react';
import {
  LineChart,
  BarChart,
  PieChart,
  Pie,
  Cell,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  PieChart as PieIcon,
  Users,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  CommitTrend,
  RepositoryShare,
  ContributorShare,
  HeatmapCell,
  Repository,
} from '../types';
import { api } from '../lib/api';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

interface AnalyticsViewProps {
  repositories: Repository[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ repositories }) => {
  const [days, setDays] = useState(30);
  const [includeMerges, setIncludeMerges] = useState(false);
  const [trends, setTrends] = useState<CommitTrend[]>([]);
  const [repoShares, setRepoShares] = useState<RepositoryShare[]>([]);
  const [contribShares, setContribShares] = useState<ContributorShare[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [days, includeMerges]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [trendRes, repoRes, contribRes, heatRes] = await Promise.all([
        api.getCommitTrends(days, 'daily', undefined, includeMerges),
        api.getRepositoryDistribution(days, includeMerges),
        api.getContributorLeaderboard(days, undefined, 8, includeMerges),
        api.getHeatmap(days),
      ]);
      setTrends(trendRes.data);
      setRepoShares(repoRes);
      setContribShares(contribRes);
      setHeatmap(heatRes);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Repository & Contributor Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Database-backed velocity metrics, repository distribution, and activity heatmaps.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 text-xs font-medium">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-md transition ${
                  days === d
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMerges}
              onChange={(e) => setIncludeMerges(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800"
            />
            <span>Include Merges</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Commit Volume Trend */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Daily Commit Velocity ({days} Days)
                  </h3>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => val.slice(5)}
                      stroke="#94a3b8"
                      fontSize={10}
                    />
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
                    <Bar dataKey="commits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Repository Commit Distribution */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Repository Activity Share
                  </h3>
                </div>
              </div>

              <div className="h-64 w-full flex items-center">
                {repoShares.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={repoShares}
                        dataKey="commit_count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {repoShares.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full text-center text-xs text-slate-400">
                    No commits recorded in selected time window.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Contributors Velocity Bar */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Contributor Commit Distribution ({days} Days)
              </h3>
            </div>

            <div className="h-64 w-full">
              {contribShares.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={contribShares}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#94a3b8"
                      fontSize={11}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="commit_count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No contributor activity in this range.
                </div>
              )}
            </div>
          </div>

          {/* Activity Heatmap Grid */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Commit Heatmap by Date
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Less</span>
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-800"></span>
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-200 dark:bg-blue-900"></span>
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 dark:bg-blue-600"></span>
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 dark:bg-blue-400"></span>
                <span>More</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 overflow-x-auto py-2">
              {heatmap.map((cell) => {
                let color = 'bg-slate-100 dark:bg-slate-800';
                if (cell.commit_count > 0 && cell.commit_count <= 2) {
                  color = 'bg-blue-200 dark:bg-blue-900';
                } else if (cell.commit_count > 2 && cell.commit_count <= 6) {
                  color = 'bg-blue-400 dark:bg-blue-600';
                } else if (cell.commit_count > 6) {
                  color = 'bg-blue-600 dark:bg-blue-400';
                }

                return (
                  <div
                    key={cell.date}
                    className={`w-3.5 h-3.5 rounded-sm ${color} transition-all hover:ring-2 hover:ring-blue-500 cursor-pointer`}
                    title={`${cell.date}: ${cell.commit_count} commits`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
