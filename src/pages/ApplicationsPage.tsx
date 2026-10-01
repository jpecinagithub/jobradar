import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, GripVertical, KanbanSquare, MapPin, Search } from 'lucide-react';
import type { ApplicationStage, SavedJobEntry } from '../lib/types';
import { STAGE_LABEL } from '../lib/types';
import { timeAgo } from '../lib/normalize';
import { useUserStore } from '../store/useUserStore';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { ApplyButton } from '../components/jobs/ApplyButton';
import { cn } from '../components/ui/cn';

const COLUMNS: ApplicationStage[] = ['saved', 'applied', 'screening', 'interview', 'final', 'offer', 'rejected'];
const ARCHIVED: ApplicationStage[] = ['withdrawn', 'not_interested'];

const DOT: Record<ApplicationStage, string> = {
  saved: 'bg-ink-400',
  applied: 'bg-brand-500',
  screening: 'bg-violet-500',
  interview: 'bg-amber-500',
  final: 'bg-orange-500',
  offer: 'bg-emerald-500',
  rejected: 'bg-red-500',
  withdrawn: 'bg-ink-300',
  not_interested: 'bg-ink-300',
};

function KanbanCard({ entry, onDragStart, onDragEnd }: {
  entry: SavedJobEntry;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const navigate = useNavigate();
  const setStage = useUserStore((s) => s.setStage);
  const job = entry.snapshot;
  const loc = [job.city, job.country].filter(Boolean).join(', ') || 'Location not specified';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => navigate(`/job/${job.id}`)}
      className="cursor-grab rounded-xl border border-ink-200 bg-white p-3.5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-600/40 hover:shadow-[0_8px_20px_rgba(8,145,178,0.10)] active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-[14px] font-semibold leading-snug tracking-tight text-ink-900">{job.title}</h4>
          <p className="mt-0.5 truncate text-[13px] text-ink-600">{job.company}</p>
        </div>
        <GripVertical size={15} className="mt-0.5 shrink-0 text-ink-300" />
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[12.5px] text-ink-500">
        <MapPin size={12} />{loc}
      </p>
      <div
        className="mt-3 flex flex-col gap-2 border-t border-ink-100 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <Select
          value={entry.stage}
          onChange={(e) => setStage(entry.jobId, e.target.value as ApplicationStage)}
          className="h-8 text-[12.5px]"
          aria-label="Move to stage"
        >
          {(Object.keys(STAGE_LABEL) as ApplicationStage[]).map((s) => (
            <option key={s} value={s}>{STAGE_LABEL[s]}</option>
          ))}
        </Select>
        <ApplyButton job={job} size="sm" className="w-full" />
        <p className="text-[11.5px] text-ink-400">Updated {timeAgo(entry.updatedAt)}</p>
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const entries = useUserStore((s) => s.entries);
  const setStage = useUserStore((s) => s.setStage);
  const unsaveJob = useUserStore((s) => s.unsaveJob);
  const [dragOver, setDragOver] = useState<ApplicationStage | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const byStage = (s: ApplicationStage) => entries.filter((e) => e.stage === s);
  const archived = entries.filter((e) => ARCHIVED.includes(e.stage));

  const handleDrop = (e: React.DragEvent, stage: ApplicationStage) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('text/plain');
    if (jobId) setStage(jobId, stage);
    setDragOver(null);
    setDraggingId(null);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-[28px]">Applications</h1>
          <p className="mt-1 text-[14px] text-ink-500">
            Drag cards between stages to track your pipeline.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/search')}>
          <Search size={15} /> Find jobs
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-ink-300 bg-white px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <KanbanSquare size={26} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink-900">Your pipeline is empty</h2>
          <p className="mt-1 max-w-sm text-[14px] text-ink-500">
            Save jobs from your search results and they will appear here, ready to move through your pipeline.
          </p>
          <Button variant="brand" className="mt-5" onClick={() => navigate('/search')}>
            <Search size={15} /> Search jobs
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex gap-3 overflow-x-auto pb-4 nice-scroll">
            {COLUMNS.map((stage) => {
              const cards = byStage(stage);
              const active = dragOver === stage;
              return (
                <div
                  key={stage}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                  onDragLeave={() => setDragOver((d) => (d === stage ? null : d))}
                  onDrop={(e) => handleDrop(e, stage)}
                  className={cn(
                    'flex w-[280px] shrink-0 flex-col rounded-2xl border p-3 transition-colors duration-150',
                    active ? 'border-brand-500 bg-brand-50/50' : 'border-ink-200 bg-ink-50/60',
                  )}
                >
                  <div className="flex items-center justify-between px-1 pb-2.5">
                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-800">
                      <span className={cn('h-2 w-2 rounded-full', DOT[stage])} />
                      {STAGE_LABEL[stage]}
                    </span>
                    <Badge variant={active ? 'brand' : 'secondary'}>{cards.length}</Badge>
                  </div>

                  <div className="flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto nice-scroll pr-0.5">
                    {cards.map((e) => (
                      <KanbanCard
                        key={e.jobId}
                        entry={e}
                        onDragStart={(ev) => {
                          ev.dataTransfer.setData('text/plain', e.jobId);
                          ev.dataTransfer.effectAllowed = 'move';
                          setDraggingId(e.jobId);
                        }}
                        onDragEnd={() => { setDraggingId(null); setDragOver(null); }}
                      />
                    ))}
                    {cards.length === 0 && (
                      <div
                        className={cn(
                          'flex h-24 items-center justify-center rounded-xl border-2 border-dashed text-center text-[12.5px]',
                          active ? 'border-brand-400 text-brand-700' : 'border-ink-200 text-ink-400',
                          draggingId && 'opacity-100',
                        )}
                      >
                        {draggingId ? 'Drop here' : 'Empty'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {archived.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2">
                <Archive size={16} className="text-ink-500" />
                <h2 className="text-[16px] font-semibold text-ink-900">Archived</h2>
                <Badge variant="secondary">{archived.length}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {archived.map((e) => (
                  <Card key={e.jobId} className="p-4 opacity-90">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4
                          className="cursor-pointer truncate text-[14px] font-semibold text-ink-900 hover:text-brand-700"
                          onClick={() => navigate(`/job/${e.jobId}`)}
                        >
                          {e.snapshot.title}
                        </h4>
                        <p className="truncate text-[13px] text-ink-600">{e.snapshot.company}</p>
                      </div>
                      <Badge variant="outline">{STAGE_LABEL[e.stage]}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Select
                        value={e.stage}
                        onChange={(ev) => setStage(e.jobId, ev.target.value as ApplicationStage)}
                        className="h-8 flex-1 text-[12.5px]"
                        aria-label="Restore to stage"
                      >
                        {(Object.keys(STAGE_LABEL) as ApplicationStage[]).map((s) => (
                          <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                        ))}
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:bg-danger-50"
                        onClick={() => {
                          if (window.confirm(`Remove "${e.snapshot.title}" from your tracker?`)) unsaveJob(e.jobId);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
