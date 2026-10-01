import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { timeAgo, formatSalaryCompact } from '../../lib/normalize';
import { DEMO_JOBS } from '../../lib/demoJobs';
import { SOURCE_TYPE_LABEL, SENIORITY_LABEL, type JobStatus, type SourceType } from '../../lib/types';

const STATUS_VARIANT: Record<JobStatus, 'success' | 'warning' | 'danger' | 'secondary'> = {
  ACTIVE: 'success', MAY_BE_CLOSED: 'warning', CLOSED: 'danger', UNKNOWN: 'secondary',
};

export default function JobsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | SourceType>('');
  const [statusFilter, setStatusFilter] = useState<'' | JobStatus>('');

  const jobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_JOBS.filter((j) => {
      if (typeFilter && j.sourceType !== typeFilter) return false;
      if (statusFilter && j.status !== statusFilter) return false;
      if (!q) return true;
      return [j.title, j.company, j.city, j.country, j.normalizedTitle]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q));
    });
  }, [query, typeFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Jobs</h2>
        <p className="text-sm text-ink-500">Everything currently in the index.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, company, city…"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as '' | SourceType)} className="sm:w-48">
          <option value="">All source types</option>
          {(['PRIMARY', 'ATS', 'SPECIALIST_BOARD', 'OFFICIAL', 'AGGREGATOR', 'SEARCH_ENGINE'] as SourceType[]).map((t) => (
            <option key={t} value={t}>{SOURCE_TYPE_LABEL[t]}</option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | JobStatus)} className="sm:w-44">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="MAY_BE_CLOSED">May be closed</option>
          <option value="CLOSED">Closed</option>
          <option value="UNKNOWN">Unknown</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {jobs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3 font-medium">Job</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Posted</th>
                    <th className="px-4 py-3 font-medium">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr
                      key={j.id}
                      onClick={() => navigate(`/job/${j.id}`)}
                      className="cursor-pointer border-b border-ink-100 last:border-0 hover:bg-ink-50/60"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900">{j.title}</div>
                        <div className="text-xs text-ink-500">{j.company} · {SENIORITY_LABEL[j.seniority]} · {formatSalaryCompact(j.salaryMin, j.salaryMax, j.salaryCurrency ?? 'EUR')}</div>
                      </td>
                      <td className="px-4 py-3 text-ink-600">{[j.city, j.country].filter(Boolean).join(', ') || 'Remote'}</td>
                      <td className="px-4 py-3 text-ink-600">{j.source}</td>
                      <td className="px-4 py-3"><Badge variant="secondary">{SOURCE_TYPE_LABEL[j.sourceType]}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[j.status]}>{j.status.replace(/_/g, ' ')}</Badge></td>
                      <td className="px-4 py-3 text-ink-600">{timeAgo(j.postedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex w-28 items-center gap-2">
                          <Progress value={j.qualityScore} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium text-ink-700">{j.qualityScore}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-ink-500">No jobs match these filters.</p>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-ink-400">{jobs.length} of {DEMO_JOBS.length} indexed jobs shown.</p>
    </div>
  );
}
