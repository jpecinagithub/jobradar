import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { getSearchRuns } from '../../lib/storage';
import { DEMO_JOBS } from '../../lib/demoJobs';
import { findDuplicateGroups } from '../../lib/dedup';
import { SOURCE_TYPE_LABEL } from '../../lib/types';
import { useAdminStore } from '../../store/useAdminStore';
import { useUserStore } from '../../store/useUserStore';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#ec4899'];

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center">
      <p className="max-w-xs text-center text-sm text-ink-500">{text}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const sources = useAdminStore((s) => s.sources);
  const threshold = useAdminStore((s) => s.config.duplicateThreshold);
  const entries = useUserStore((s) => s.entries);

  const data = useMemo(() => {
    const jobs = DEMO_JOBS;

    // searches over time (last 14 days)
    const runs = getSearchRuns();
    const dayKey = (iso: string) => iso.slice(0, 10);
    const buckets = new Map<string, number>();
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.set(dayKey(d.toISOString()), 0);
    }
    for (const r of runs) {
      const k = dayKey(r.runAt);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    const searchesOverTime = [...buckets.entries()].map(([day, searches]) => ({ day: day.slice(5), searches }));

    // jobs per source
    const bySource = new Map<string, number>();
    for (const j of jobs) bySource.set(j.source, (bySource.get(j.source) ?? 0) + 1);
    const jobsPerSource = [...bySource.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name: name.length > 20 ? `${name.slice(0, 19)}…` : name, count }));

    // jobs by source type
    const byType = new Map<string, number>();
    for (const j of jobs) byType.set(j.sourceType, (byType.get(j.sourceType) ?? 0) + 1);
    const jobsByType = [...byType.entries()].map(([t, value]) => ({
      name: SOURCE_TYPE_LABEL[t as keyof typeof SOURCE_TYPE_LABEL] ?? t,
      value,
    }));

    // duplicate rate
    const groups = findDuplicateGroups(jobs, { threshold });
    const merged = groups.reduce((n, g) => n + g.members.length, 0);
    const duplicateRate = jobs.length ? Math.round((merged / jobs.length) * 100) : 0;

    // top industries
    const byIndustry = new Map<string, number>();
    for (const j of jobs) for (const ind of j.industry) byIndustry.set(ind, (byIndustry.get(ind) ?? 0) + 1);
    const topIndustries = [...byIndustry.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name: name.length > 22 ? `${name.slice(0, 21)}…` : name, count }));

    // tracker activity
    const applied = entries.filter((e) => e.stage === 'applied').length;
    const saved = entries.length;

    return { runs, searchesOverTime, jobsPerSource, jobsByType, merged, duplicateRate, topIndustries, applied, saved };
  }, [sources, threshold, entries]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Analytics</h2>
        <p className="text-sm text-ink-500">Usage, index composition and pipeline quality.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Searches over time</CardTitle>
            <CardDescription>Searches run in the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {data.runs.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.searchesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="searches" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No searches recorded yet. Run a search and it will show up here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jobs per source</CardTitle>
            <CardDescription>Which sources contribute most jobs</CardDescription>
          </CardHeader>
          <CardContent>
            {data.jobsPerSource.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.jobsPerSource} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No jobs indexed yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jobs by source type</CardTitle>
            <CardDescription>Index composition by source priority class</CardDescription>
          </CardHeader>
          <CardContent>
            {data.jobsByType.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.jobsByType} dataKey="value" nameKey="name" outerRadius={90} label={{ fontSize: 11 }}>
                    {data.jobsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No jobs indexed yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top industries</CardTitle>
            <CardDescription>Most represented industries in the index</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topIndustries.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.topIndustries} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No jobs indexed yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline quality</CardTitle>
            <CardDescription>Deduplication and ranking health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3">
              <span className="text-sm text-ink-600">Duplicate rate</span>
              <span className="text-lg font-bold text-ink-900">{data.duplicateRate}%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3">
              <span className="text-sm text-ink-600">Postings merged into canonicals</span>
              <span className="text-lg font-bold text-ink-900">{data.merged}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3">
              <span className="text-sm text-ink-600">Average match score</span>
              <span className="text-sm font-medium text-ink-400">No search data yet</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
            <CardDescription>Tracker activity on this device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3">
              <span className="text-sm text-ink-600">Saved jobs</span>
              <span className="text-lg font-bold text-ink-900">{data.saved}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3">
              <span className="text-sm text-ink-600">Marked as applied</span>
              <span className="text-lg font-bold text-ink-900">{data.applied}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3">
              <span className="text-sm text-ink-600">Apply clicks</span>
              <span className="text-sm font-medium text-ink-400">Not tracked in this demo</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
