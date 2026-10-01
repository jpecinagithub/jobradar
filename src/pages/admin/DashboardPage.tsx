import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
} from 'recharts';
import { Database, Briefcase, Clock, CheckCircle2, XCircle, Copy, Search, Star } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { timeAgo, daysSince } from '../../lib/normalize';
import { findDuplicateGroups } from '../../lib/dedup';
import { getSearchRuns } from '../../lib/storage';
import { DEMO_JOBS } from '../../lib/demoJobs';
import { SOURCE_TYPE_LABEL } from '../../lib/types';
import { useAdminStore } from '../../store/useAdminStore';

const PIE_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Database; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</span>
          <Icon className="h-4 w-4 text-ink-400" />
        </div>
        <div className="mt-2 text-3xl font-bold text-ink-900">{value}</div>
        {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const sources = useAdminStore((s) => s.sources);
  const config = useAdminStore((s) => s.config);

  const stats = useMemo(() => {
    const jobs = DEMO_JOBS;
    const activeSources = sources.filter((s) => s.enabled).length;
    const new24h = jobs.filter((j) => daysSince(j.postedAt) <= 1).length;
    const active = jobs.filter((j) => j.status === 'ACTIVE').length;
    const closed = jobs.filter((j) => j.status === 'CLOSED').length;
    const groups = findDuplicateGroups(jobs, { threshold: config.duplicateThreshold });
    const merged = groups.reduce((n, g) => n + g.members.length, 0);
    const runs = getSearchRuns().length;
    const avgQuality = jobs.length ? Math.round(jobs.reduce((n, j) => n + j.qualityScore, 0) / jobs.length) : 0;

    const bySource = new Map<string, number>();
    for (const j of jobs) bySource.set(j.source, (bySource.get(j.source) ?? 0) + 1);
    const topSources = [...bySource.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name: name.length > 22 ? `${name.slice(0, 21)}…` : name, count }));

    const byType = new Map<string, number>();
    for (const j of jobs) byType.set(j.sourceType, (byType.get(j.sourceType) ?? 0) + 1);
    const typePie = [...byType.entries()].map(([t, value]) => ({
      name: SOURCE_TYPE_LABEL[t as keyof typeof SOURCE_TYPE_LABEL] ?? t,
      value,
    }));

    return { activeSources, jobs: jobs.length, new24h, active, closed, merged, runs, avgQuality, topSources, typePie, groups };
  }, [sources, config.duplicateThreshold]);

  const errorSources = sources.filter((s) => s.errors > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Dashboard</h2>
        <p className="text-sm text-ink-500">Index health, pipeline activity and source status at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Database} label="Active sources" value={stats.activeSources} sub={`${sources.length} configured`} />
        <StatCard icon={Briefcase} label="Jobs indexed" value={stats.jobs} />
        <StatCard icon={Clock} label="New jobs 24h" value={stats.new24h} />
        <StatCard icon={CheckCircle2} label="Active jobs" value={stats.active} sub={`${stats.closed} closed`} />
        <StatCard icon={XCircle} label="Expired / closed" value={stats.closed} />
        <StatCard icon={Copy} label="Duplicates detected" value={stats.merged} sub={`in ${stats.groups.filter((g) => g.members.length > 0).length} groups`} />
        <StatCard icon={Search} label="Searches run" value={stats.runs} />
        <StatCard icon={Star} label="Avg quality score" value={stats.avgQuality} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Jobs per source</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topSources.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.topSources} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-ink-500">No jobs indexed yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jobs by source type</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.typePie.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={stats.typePie} dataKey="value" nameKey="name" outerRadius={95} label={{ fontSize: 12 }}>
                    {stats.typePie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-ink-500">No jobs indexed yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent source errors</CardTitle>
        </CardHeader>
        <CardContent>
          {errorSources.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="py-2 pr-4 font-medium">Source</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Last scan</th>
                    <th className="py-2 font-medium text-right">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {errorSources.map((s) => (
                    <tr key={s.id} className="border-b border-ink-100 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-ink-900">{s.name}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={s.status === 'ERROR' ? 'danger' : 'warning'}>{s.status}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-ink-500">{s.lastScan ? timeAgo(s.lastScan) : 'Never'}</td>
                      <td className="py-2.5 text-right font-semibold text-danger-600">{s.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-ink-500">No source errors recorded. Pipeline is healthy.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
