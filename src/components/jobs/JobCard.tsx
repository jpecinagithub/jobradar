import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Clock, MapPin } from 'lucide-react';
import type { ScoredJob } from '../../lib/types';
import { CONTRACT_LABEL, REMOTE_LABEL, SENIORITY_LABEL } from '../../lib/types';
import { timeAgo, formatSalaryCompact } from '../../lib/normalize';
import { MatchBadge } from './MatchBadge';
import { SourceBadge } from './SourceBadge';
import { ApplyButton } from './ApplyButton';
import { JobStatusBadge } from './JobStatusBadge';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useUserStore } from '../../store/useUserStore';
import { cn } from '../ui/cn';

export function JobCard({ scored, isNew, duplicateInfo }: {
  scored: ScoredJob;
  isNew?: boolean;
  duplicateInfo?: { count: number; sources: string[] };
}) {
  const navigate = useNavigate();
  const { job } = scored;
  const stage = useUserStore((s) => s.stageOf(job.id));
  const saveJob = useUserStore((s) => s.saveJob);
  const unsaveJob = useUserStore((s) => s.unsaveJob);
  const [showDupes, setShowDupes] = useState(false);

  const saved = !!stage && stage !== 'not_interested';
  const loc = [job.city, job.country].filter(Boolean).join(', ') || 'Location not specified';

  return (
    <article
      className="group fade-up cursor-pointer rounded-2xl border border-ink-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-600/40 hover:shadow-[0_8px_24px_rgba(8,145,178,0.08)]"
      onClick={() => navigate(`/job/${job.id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[16px] font-semibold tracking-tight text-ink-900 group-hover:text-brand-700">
              {job.title}
            </h3>
            {isNew && <Badge variant="brand">New</Badge>}
            {job.status !== 'ACTIVE' && <JobStatusBadge status={job.status} />}
          </div>
          <p className="mt-0.5 text-[14px] font-medium text-ink-700">{job.company}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
            <span className="inline-flex items-center gap-1"><MapPin size={13} />{loc}</span>
            <span className="inline-flex items-center gap-1"><Clock size={13} />{timeAgo(job.postedAt)}</span>
          </div>
        </div>
        <MatchBadge scored={scored} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
        <Badge variant="secondary">{CONTRACT_LABEL[job.employmentType]}</Badge>
        <Badge variant="secondary">{REMOTE_LABEL[job.remoteType]}</Badge>
        <Badge variant="secondary">{SENIORITY_LABEL[job.seniority]}</Badge>
        {(job.salaryMin != null || job.salaryMax != null) ? (
          <span className="font-semibold text-ink-900">
            {formatSalaryCompact(job.salaryMin, job.salaryMax, job.salaryCurrency)}
            {job.salaryPeriod === 'monthly' ? ' /mo' : job.salaryPeriod === 'hourly' ? ' /h' : ''}
          </span>
        ) : (
          <span className="text-ink-400">Salary not specified</span>
        )}
      </div>

      {(job.languagesRequired.length > 0 || job.languagesPreferred.length > 0) && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
          {job.languagesRequired.map((l) => (
            <span key={l} className="font-medium text-ink-800">{l} <span className="font-normal text-ink-400">required</span></span>
          ))}
          {job.languagesPreferred.map((l) => (
            <span key={l} className="text-ink-500">{l} <span className="text-ink-400">preferred</span></span>
          ))}
        </div>
      )}

      {job.skills.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 6).map((s) => (
            <span key={s} className="rounded-md bg-ink-100 px-2 py-0.5 text-[12px] font-medium text-ink-700">{s}</span>
          ))}
        </div>
      )}

      <div className="mt-3">
        <SourceBadge job={job} />
      </div>

      {duplicateInfo && duplicateInfo.count > 0 && (
        <div className="mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowDupes((v) => !v); }}
            className="text-[12.5px] font-medium text-brand-700 hover:underline"
          >
            Also found on {duplicateInfo.count} other source{duplicateInfo.count > 1 ? 's' : ''}
          </button>
          {showDupes && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {duplicateInfo.sources.map((s) => (
                <Badge key={s} variant="outline">{s}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-3.5">
        <Button
          variant="outline" size="sm" className="flex-1"
          onClick={(e) => { e.stopPropagation(); navigate(`/job/${job.id}`); }}
        >
          View details
        </Button>
        <ApplyButton job={job} size="sm" className="flex-1" />
        <Button
          variant={saved ? 'secondary' : 'ghost'} size="sm"
          aria-label={saved ? 'Saved' : 'Save job'}
          onClick={(e) => {
            e.stopPropagation();
            saved ? unsaveJob(job.id) : saveJob(job);
          }}
          className={cn(saved && 'text-brand-700')}
        >
          {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
        </Button>
      </div>
    </article>
  );
}
