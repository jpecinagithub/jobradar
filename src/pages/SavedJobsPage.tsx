import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkX, Eye, MapPin, Pencil, Search, StickyNote, Trash2 } from 'lucide-react';
import type { ApplicationStage, SavedJobEntry } from '../lib/types';
import { STAGE_LABEL } from '../lib/types';
import { formatSalaryCompact, timeAgo } from '../lib/normalize';
import { useUserStore } from '../store/useUserStore';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { ApplyButton } from '../components/jobs/ApplyButton';
import { JobStatusBadge } from '../components/jobs/JobStatusBadge';
import { cn } from '../components/ui/cn';

const STAGE_BADGE: Record<ApplicationStage, 'secondary' | 'brand' | 'violet' | 'warning' | 'success' | 'danger' | 'outline'> = {
  saved: 'secondary',
  applied: 'brand',
  screening: 'violet',
  interview: 'warning',
  final: 'warning',
  offer: 'success',
  rejected: 'danger',
  withdrawn: 'danger',
  not_interested: 'outline',
};

type Tab = ApplicationStage | 'all';
const TABS: Tab[] = ['all', 'saved', 'applied', 'screening', 'interview', 'final', 'offer', 'rejected', 'withdrawn', 'not_interested'];

function SavedJobRow({ entry }: { entry: SavedJobEntry }) {
  const navigate = useNavigate();
  const setStage = useUserStore((s) => s.setStage);
  const unsaveJob = useUserStore((s) => s.unsaveJob);
  const setNotes = useUserStore((s) => s.setNotes);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotesLocal] = useState(entry.notes ?? '');

  const job = entry.snapshot;
  const loc = [job.city, job.country].filter(Boolean).join(', ') || 'Location not specified';
  const salary = formatSalaryCompact(job.salaryMin, job.salaryMax, job.salaryCurrency);

  const handleRemove = () => {
    if (window.confirm(`Remove "${job.title}" from your tracker?`)) unsaveJob(entry.jobId);
  };

  const handleNotesBlur = () => {
    if (notes !== (entry.notes ?? '')) setNotes(entry.jobId, notes);
  };

  return (
    <Card className="p-5 transition-all duration-200 hover:shadow-[0_8px_24px_rgba(8,145,178,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="cursor-pointer text-[16px] font-semibold tracking-tight text-ink-900 hover:text-brand-700"
              onClick={() => navigate(`/job/${job.id}`)}
            >
              {job.title}
            </h3>
            {job.status !== 'ACTIVE' && <JobStatusBadge status={job.status} />}
          </div>
          <p className="mt-0.5 text-[14px] font-medium text-ink-700">{job.company}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
            <span className="inline-flex items-center gap-1"><MapPin size={13} />{loc}</span>
            <span className="font-medium text-ink-800">{salary}</span>
            <span>Saved {timeAgo(entry.savedAt)}</span>
          </div>
        </div>
        <Badge variant={STAGE_BADGE[entry.stage]}>{STAGE_LABEL[entry.stage]}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3.5">
        <Button variant="outline" size="sm" onClick={() => navigate(`/job/${job.id}`)}>
          <Eye size={14} /> View
        </Button>
        <ApplyButton job={job} size="sm" />
        <Select
          value={entry.stage}
          onChange={(e) => setStage(entry.jobId, e.target.value as ApplicationStage)}
          className="w-auto min-w-[150px]"
          aria-label="Change stage"
        >
          {(Object.keys(STAGE_LABEL) as ApplicationStage[]).map((s) => (
            <option key={s} value={s}>{STAGE_LABEL[s]}</option>
          ))}
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setNotesOpen((v) => !v)}
          className={cn(entry.notes && 'text-brand-700')}
        >
          <StickyNote size={14} /> Notes
        </Button>
        <Button variant="ghost" size="sm" onClick={handleRemove} className="text-danger-600 hover:bg-danger-50">
          <Trash2 size={14} /> Remove
        </Button>
      </div>

      {notesOpen && (
        <div className="mt-3 fade-up">
          <Textarea
            value={notes}
            onChange={(e) => setNotesLocal(e.target.value)}
            onBlur={handleNotesBlur}
            rows={3}
            placeholder="Add a private note about this job…"
          />
          <p className="mt-1 text-[12px] text-ink-400">Notes are saved automatically when you click outside.</p>
        </div>
      )}
    </Card>
  );
}

export default function SavedJobsPage() {
  const navigate = useNavigate();
  const entries = useUserStore((s) => s.entries);
  const counts = useUserStore((s) => s.counts);
  const [tab, setTab] = useState<Tab>('all');

  const countsMap = counts();
  const total = entries.length;

  const filtered = useMemo(() => {
    const list = tab === 'all' ? entries : entries.filter((e) => e.stage === tab);
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [entries, tab]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-[28px]">Saved Jobs</h1>
          <p className="mt-1 text-[14px] text-ink-500">
            Your shortlist and application tracker, all in one place.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/search')}>
          <Search size={15} /> Find jobs
        </Button>
      </div>

      {total === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-ink-300 bg-white px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <BookmarkX size={26} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink-900">No saved jobs yet</h2>
          <p className="mt-1 max-w-sm text-[14px] text-ink-500">
            Save interesting jobs from your search results and track them through your pipeline here.
          </p>
          <Button variant="brand" className="mt-5" onClick={() => navigate('/search')}>
            <Search size={15} /> Search jobs
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 nice-scroll">
            {TABS.map((t) => {
              const count = t === 'all' ? total : (countsMap[t] ?? 0);
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150',
                    active
                      ? 'border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                      : 'border-ink-300 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50',
                  )}
                >
                  {t === 'all' ? 'All' : STAGE_LABEL[t]}
                  <span className={cn(
                    'rounded-full px-1.5 text-[12px] font-semibold',
                    active ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-600',
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            {filtered.map((e) => (
              <SavedJobRow key={e.jobId} entry={e} />
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-300 bg-white px-6 py-12 text-center">
                <Pencil size={22} className="text-ink-400" />
                <p className="mt-2 text-[14px] font-medium text-ink-700">Nothing in this stage yet</p>
                <p className="mt-0.5 text-[13px] text-ink-500">Move jobs between stages to see them here.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
