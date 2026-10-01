import { useMemo } from 'react';
import { Crown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { timeAgo } from '../../lib/normalize';
import { findDuplicateGroups } from '../../lib/dedup';
import { DEMO_JOBS } from '../../lib/demoJobs';
import { SOURCE_TYPE_LABEL, SOURCE_PRIORITY } from '../../lib/types';
import { useAdminStore } from '../../store/useAdminStore';

export default function DuplicatesPage() {
  const threshold = useAdminStore((s) => s.config.duplicateThreshold);

  const { groups, merged } = useMemo(() => {
    const all = findDuplicateGroups(DEMO_JOBS, { threshold });
    const withMembers = all.filter((g) => g.members.length > 0);
    const mergedCount = withMembers.reduce((n, g) => n + g.members.length, 0);
    return { groups: withMembers, merged: mergedCount };
  }, [threshold]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Duplicates</h2>
        <p className="text-sm text-ink-500">
          Postings detected as the same vacancy. Only the most original source is kept visible to users.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-5"><div className="text-3xl font-bold text-ink-900">{groups.length}</div><div className="mt-1 text-xs text-ink-500">Duplicate groups</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-3xl font-bold text-ink-900">{merged}</div><div className="mt-1 text-xs text-ink-500">Postings merged</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-3xl font-bold text-ink-900">{threshold}%</div><div className="mt-1 text-xs text-ink-500">Merge threshold</div></CardContent></Card>
      </div>

      {groups.length ? (
        <div className="space-y-4">
          {groups.map((g) => {
            const c = g.canonical;
            return (
              <Card key={g.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-600" />
                    <CardTitle className="text-base">{c.title} — {c.company}</CardTitle>
                  </div>
                  <p className="text-xs text-ink-500">
                    Canonical kept: <span className="font-medium text-ink-700">{SOURCE_TYPE_LABEL[c.sourceType]}</span>
                    {' '}({c.source}) · priority {SOURCE_PRIORITY[c.sourceType]}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border-2 border-amber-200 bg-amber-50/60 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-ink-900">{c.title}</div>
                        <div className="text-xs text-ink-500">
                          {[c.city, c.country].filter(Boolean).join(', ') || 'Remote'} · posted {timeAgo(c.postedAt)}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Badge variant="success">{SOURCE_TYPE_LABEL[c.sourceType]}</Badge>
                        <Badge variant="outline">{c.source}</Badge>
                      </div>
                    </div>
                    <Badge variant="warning" className="mt-2">Canonical — most original source</Badge>
                  </div>

                  {g.members.map((m) => (
                    <div key={m.job.id} className="rounded-lg border border-ink-200 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-ink-900">{m.job.title}</div>
                          <div className="text-xs text-ink-500">
                            {m.job.source} · {[m.job.city, m.job.country].filter(Boolean).join(', ') || 'Remote'}
                          </div>
                        </div>
                        <Badge variant="secondary">{SOURCE_TYPE_LABEL[m.job.sourceType]}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={m.confidence} className="h-1.5 flex-1" />
                        <span className="text-xs font-semibold text-ink-700">{m.confidence}% confidence</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-ink-900">No duplicate groups detected</p>
            <p className="mt-1 text-sm text-ink-500">
              Either the index is clean or the merge threshold ({threshold}%) is too strict. Adjust it under Search Engine.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
