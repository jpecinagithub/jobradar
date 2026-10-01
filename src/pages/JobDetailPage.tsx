import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, Bookmark, BookmarkCheck, CheckCircle2,
  Building2, Briefcase, Layers, Wallet, Globe2, FileText,
} from 'lucide-react';
import { DEMO_JOBS } from '../lib/demoJobs';
import { useSearchStore } from '../store/useSearchStore';
import { useUserStore } from '../store/useUserStore';
import { scoreJob } from '../lib/match';
import { findDuplicateGroups } from '../lib/dedup';
import { timeAgo, formatSalaryCompact, convertSalary, annualize } from '../lib/normalize';
import { MatchRing } from '../components/jobs/MatchBadge';
import { SourceBadge } from '../components/jobs/SourceBadge';
import { ApplyButton } from '../components/jobs/ApplyButton';
import { JobStatusBadge } from '../components/jobs/JobStatusBadge';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import type { Job, VisaSponsorship } from '../lib/types';
import {
  REMOTE_LABEL, SENIORITY_LABEL, CONTRACT_LABEL, SOURCE_TYPE_LABEL, BRAND,
} from '../lib/types';
import { cn } from '../components/ui/cn';

const VISA_LABEL: Record<VisaSponsorship, string> = {
  confirmed: 'Confirmed',
  possible: 'Possible',
  not_mentioned: 'Not mentioned',
};

function fmtDate(iso?: string): string {
  if (!iso) return 'Not specified';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Meta({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-ink-50 p-3.5">
      <Icon size={17} className="mt-0.5 shrink-0 text-brand-700" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
        <p className="mt-0.5 text-[13.5px] font-medium text-ink-900">{value}</p>
      </div>
    </div>
  );
}

function experienceLabel(job: Job): string {
  if (job.experienceMin != null && job.experienceMax != null)
    return `${job.experienceMin}–${job.experienceMax} years`;
  if (job.experienceMin != null) return `${job.experienceMin}+ years`;
  if (job.experienceMax != null) return `Up to ${job.experienceMax} years`;
  return 'Not specified';
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const draft = useSearchStore((s) => s.draft);
  const entries = useUserStore((s) => s.entries);
  const saveJob = useUserStore((s) => s.saveJob);
  const unsaveJob = useUserStore((s) => s.unsaveJob);
  const stageOf = useUserStore((s) => s.stageOf);

  const job = useMemo(
    () =>
      DEMO_JOBS.find((j) => j.id === id) ??
      entries.find((e) => e.jobId === id)?.snapshot ??
      null,
    [id, entries],
  );

  const scored = useMemo(() => (job ? scoreJob(job, draft) : null), [job, draft]);

  const dupGroups = useMemo(() => findDuplicateGroups(DEMO_JOBS), []);
  const dupInfo = useMemo(() => {
    if (!job) return undefined;
    const g = dupGroups.find(
      (x) => x.canonical.id === job.id || x.members.some((m) => m.job.id === job.id),
    );
    const others = g?.members.filter((m) => m.job.id !== job.id) ?? [];
    return others.length > 0 ? others.map((m) => m.job.source) : undefined;
  }, [dupGroups, job]);

  if (!job) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Job not found</h1>
        <p className="mt-2 text-[14px] text-ink-500">
          This posting may have expired or the link is no longer valid.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} />
          Go back
        </Button>
      </div>
    );
  }

  const stage = stageOf(job.id);
  const saved = !!stage && stage !== 'not_interested';
  const loc = [job.city, job.region, job.country].filter(Boolean).join(', ') || 'Location not specified';

  const original = formatSalaryCompact(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const targetCur = draft.salaryCurrency;
  const showConverted =
    job.salaryMin != null &&
    (job.salaryCurrency ?? 'EUR') !== targetCur &&
    job.salaryCurrency != null;
  const converted = showConverted
    ? formatSalaryCompact(
        convertSalary(annualize(job.salaryMin!, job.salaryPeriod ?? 'annual'), job.salaryCurrency!, targetCur),
        job.salaryMax != null
          ? convertSalary(annualize(job.salaryMax, job.salaryPeriod ?? 'annual'), job.salaryCurrency!, targetCur)
          : undefined,
        targetCur,
      )
    : null;

  const paragraphs = job.description.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:pb-16">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
      >
        <ArrowLeft size={15} />
        Back to results
      </button>

      {/* HEADER */}
      <Card className="fade-up mt-3">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <JobStatusBadge status={job.status} />
                {job.remoteType.startsWith('remote') && <Badge variant="brand">Remote</Badge>}
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-[28px]">
                {job.title}
              </h1>
              <p className="mt-1 text-[16px] font-medium text-ink-700">{job.company}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-ink-500">
                <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{loc}</span>
                <span className="inline-flex items-center gap-1.5"><Clock size={14} />Posted {timeAgo(job.postedAt)}</span>
              </div>
              <div className="mt-4"><SourceBadge job={job} /></div>
            </div>
            {scored && (
              <div className="flex flex-col items-center gap-1.5">
                <MatchRing score={scored.score} size={84} />
                <span className="text-[11.5px] text-ink-400">vs current search</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <ApplyButton job={job} size="md" className="px-8" />
            <Button
              variant={saved ? 'secondary' : 'outline'}
              onClick={() => (saved ? unsaveJob(job.id) : saveJob(job))}
              className={cn(saved && 'text-brand-700')}
            >
              {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
              {saved ? 'Saved' : 'Save job'}
            </Button>
            {(!stage || stage === 'saved') && (
              <Button variant="ghost" onClick={() => saveJob(job, 'applied')}>
                <CheckCircle2 size={15} />
                Mark as applied
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* META GRID */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Meta icon={Briefcase} label="Work model" value={REMOTE_LABEL[job.remoteType]} />
        <Meta icon={Layers} label="Contract" value={CONTRACT_LABEL[job.employmentType]} />
        <Meta icon={Building2} label="Seniority" value={SENIORITY_LABEL[job.seniority]} />
        <Meta icon={Clock} label="Experience" value={experienceLabel(job)} />
      </div>

      {/* SALARY */}
      <Card className="mt-5">
        <CardContent className="p-6">
          <div className="flex items-center gap-2.5">
            <Wallet size={17} className="text-brand-700" />
            <h2 className="text-[16px] font-semibold text-ink-900">Salary</h2>
          </div>
          <p className="mt-2 text-[20px] font-bold tracking-tight text-ink-900">{original}</p>
          <p className="mt-1 text-[12.5px] text-ink-400">
            {job.salaryMin != null || job.salaryMax != null
              ? 'Original posting figure'
              : 'Not disclosed by the employer'}
            {converted && (
              <> · approx. <strong className="font-semibold text-ink-600">{converted}</strong> / year in {targetCur}</>
            )}
          </p>
        </CardContent>
      </Card>

      {/* LANGUAGES */}
      {(job.languagesRequired.length > 0 || job.languagesPreferred.length > 0) && (
        <Card className="mt-5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2.5">
              <Globe2 size={17} className="text-brand-700" />
              <h2 className="text-[16px] font-semibold text-ink-900">Languages</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {job.languagesRequired.map((l) => (
                <Badge key={l} variant="danger" className="px-3 py-1 text-[13px]">{l} · required</Badge>
              ))}
              {job.languagesPreferred.map((l) => (
                <Badge key={l} variant="secondary" className="px-3 py-1 text-[13px]">{l} · preferred</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SKILLS */}
      {job.skills.length > 0 && (
        <Card className="mt-5">
          <CardContent className="p-6">
            <h2 className="text-[16px] font-semibold text-ink-900">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.skills.map((s) => (
                <span key={s} className="rounded-md bg-ink-100 px-2.5 py-1 text-[13px] font-medium text-ink-700">
                  {s}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MOBILITY */}
      <Card className="mt-5">
        <CardContent className="p-6">
          <h2 className="text-[16px] font-semibold text-ink-900">Mobility & visa</h2>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl bg-ink-50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Visa sponsorship</p>
              <p className="mt-1 text-[13.5px] font-medium text-ink-900">{VISA_LABEL[job.visaSponsorship]}</p>
            </div>
            <div className="rounded-xl bg-ink-50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Relocation</p>
              <p className="mt-1 text-[13.5px] font-medium text-ink-900">
                {job.relocation ? 'Offered' : 'Not mentioned'}
              </p>
            </div>
            <div className="rounded-xl bg-ink-50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Expat package</p>
              <p className="mt-1 text-[13.5px] font-medium text-ink-900">
                {job.expatriatePackage ? 'Yes' : 'Not mentioned'}
              </p>
            </div>
          </div>
          {job.remoteRestrictionNote && (
            <p className="mt-3 text-[13px] text-ink-500">{job.remoteRestrictionNote}</p>
          )}
        </CardContent>
      </Card>

      {/* DESCRIPTION */}
      <Card className="mt-5">
        <CardContent className="p-6">
          <div className="flex items-center gap-2.5">
            <FileText size={17} className="text-brand-700" />
            <h2 className="text-[16px] font-semibold text-ink-900">Description</h2>
          </div>
          <div className="mt-3 space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[14px] leading-relaxed text-ink-700">{p}</p>
            ))}
          </div>
          {job.responsibilities.length > 0 && (
            <>
              <h3 className="mt-6 text-[14px] font-semibold text-ink-900">Responsibilities</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] text-ink-700">
                {job.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          )}
          {job.requirements.length > 0 && (
            <>
              <h3 className="mt-6 text-[14px] font-semibold text-ink-900">Requirements</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] text-ink-700">
                {job.requirements.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* SOURCE & VERIFICATION */}
      <Card className="mt-5">
        <CardContent className="p-6">
          <h2 className="text-[16px] font-semibold text-ink-900">Source & verification</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-3 text-[13.5px] sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">Source</dt>
              <dd className="font-medium text-ink-800">{job.source} ({SOURCE_TYPE_LABEL[job.sourceType]})</dd>
            </div>
            {job.originalSource && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-400">Original source</dt>
                <dd className="font-medium text-ink-800">{job.originalSource}</dd>
              </div>
            )}
            {(job.ats || job.atsJobId) && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-400">ATS</dt>
                <dd className="font-medium text-ink-800">
                  {[job.ats, job.atsJobId].filter(Boolean).join(' · ')}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">Posted</dt>
              <dd className="font-medium text-ink-800">{fmtDate(job.postedAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">Expires</dt>
              <dd className="font-medium text-ink-800">{fmtDate(job.expiresAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">Discovered</dt>
              <dd className="font-medium text-ink-800">{fmtDate(job.discoveredAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">Last verified</dt>
              <dd className="font-medium text-ink-800">{fmtDate(job.lastVerifiedAt)}</dd>
            </div>
          </dl>
          <div className="mt-5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-ink-700">Source quality</span>
              <span className="font-bold text-ink-900">{job.qualityScore}/100</span>
            </div>
            <Progress value={job.qualityScore} className="mt-2" />
            <p className="mt-1.5 text-[12px] text-ink-400">
              Information quality of the source — independent of your match score.
            </p>
          </div>
          {dupInfo && (
            <div className="mt-4 rounded-xl bg-ink-50 p-3.5">
              <p className="text-[13px] font-medium text-ink-700">
                Also found on {dupInfo.length} other source{dupInfo.length === 1 ? '' : 's'}:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {dupInfo.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
            </div>
          )}
          <div className="mt-5">
            <ApplyButton job={job} size="md" className="px-8" />
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-[12.5px] text-ink-400">
        {BRAND.name} never submits applications for you — apply directly on the original website.{' '}
        <Link to="/search" className="text-brand-700 hover:underline">Continue searching</Link>
      </p>

      {/* STICKY BOTTOM BAR — mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 p-3 backdrop-blur-md lg:hidden">
        <div className="flex gap-2">
          <ApplyButton job={job} size="md" className="flex-1" />
          <Button
            variant={saved ? 'secondary' : 'outline'}
            onClick={() => (saved ? unsaveJob(job.id) : saveJob(job))}
            aria-label={saved ? 'Saved' : 'Save job'}
            className={cn(saved && 'text-brand-700')}
          >
            {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
