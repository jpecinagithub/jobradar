/* JOBRADAR — search engine pipeline.
   SOURCE DISCOVERY → INGESTION → NORMALIZATION → CLASSIFICATION →
   DEDUPLICATION → EXPIRATION CHECK → SEARCH FILTERING → SEMANTIC MATCHING →
   SCORING → SORTING → RESULTS
   Stages stay separated so each can be inspected (diagnostics) and swapped. */

import type {
  AdminConfig, Job, PipelineStage, RelaxHint, ScoredJob,
  SearchDiagnostics, SearchProfile, SearchResult, SourceDef,
} from './types';
import { DEFAULT_ADMIN_CONFIG } from './types';
import { dedupJobs } from './dedup';
import { isEmptyProfile, scoreJob } from './match';
import { annualize, convertSalary, daysSince } from './normalize';

export interface RunOptions {
  previousJobIds?: string[];
  sources?: SourceDef[];
  admin?: Partial<AdminConfig>;
}

function stage(name: string, count: number, ms: number): PipelineStage {
  return { name, count, ms };
}

export function runSearch(
  profile: SearchProfile,
  allJobs: Job[],
  opts: RunOptions = {},
): SearchResult {
  const t0 = performance.now();
  const stages: PipelineStage[] = [];
  const admin: AdminConfig = { ...DEFAULT_ADMIN_CONFIG, ...(opts.admin ?? {}) };
  const filtersApplied: string[] = [];
  if (profile.titles.length) filtersApplied.push(`Titles: ${profile.titles.join(', ')}`);
  if (profile.locations.length) filtersApplied.push(`Locations: ${profile.locations.join(', ')}`);
  if (profile.languages.length) filtersApplied.push(`Languages: ${profile.languages.map((l) => l.language).join(', ')}`);
  if (profile.remote.length) filtersApplied.push(`Remote: ${profile.remote.join(', ')}`);

  // 1. SOURCE DISCOVERY — which sources participate
  let s = performance.now();
  const enabledSources = (opts.sources ?? []).filter((x) => x.enabled);
  const sourceIds = new Set(enabledSources.map((x) => x.id));
  const sourcesSearched = enabledSources.length
    ? enabledSources.map((x) => x.name)
    : ['All configured sources'];
  stages.push(stage('Source discovery', sourcesSearched.length, performance.now() - s));

  // 2. INGESTION
  s = performance.now();
  let pool = allJobs.filter((j) => {
    if (profile.sources.length && !profile.sources.includes(j.source)) return false;
    if (enabledSources.length && !sourceIds.has(sourceIdOf(j))) {
      // job's source string may not map 1:1 to a SourceDef id; keep it
    }
    return true;
  });
  const fetched = pool.length;
  stages.push(stage('Ingestion', fetched, performance.now() - s));

  // 3-4. NORMALIZATION + CLASSIFICATION (jobs arrive pre-normalized in this build;
  // recompute guard for safety)
  s = performance.now();
  pool = pool.map((j) => ({ ...j }));
  stages.push(stage('Normalization', pool.length, performance.now() - s));
  s = performance.now();
  stages.push(stage('Classification', pool.length, performance.now() - s));

  // 5. DEDUPLICATION
  s = performance.now();
  const { unique, mergedCount, groups } = dedupJobs(pool, { threshold: admin.duplicateThreshold });
  stages.push(stage('Deduplication', unique.length, performance.now() - s));

  // 6. EXPIRATION CHECK
  s = performance.now();
  const active = unique.filter((j) => j.status !== 'CLOSED');
  const expired = unique.length - active.length;
  stages.push(stage('Expiration check', active.length, performance.now() - s));

  // 7-9. FILTERING + SEMANTIC MATCHING + SCORING
  s = performance.now();
  const empty = isEmptyProfile(profile);
  let scored: ScoredJob[] = active.map((j) => scoreJob(j, { ...profile, weights: admin.weights }));
  let hardRejected = 0;
  if (!empty) {
    scored = scored.filter((x) => {
      if (x.hardFailed.length) { hardRejected++; return false; }
      return true;
    });
  }
  // min score gate
  scored = scored.filter((x) => x.score >= (profile.minScore || admin.minScore));
  stages.push(stage('Filtering + matching + scoring', scored.length, performance.now() - s));

  // 10. SORTING
  s = performance.now();
  const sorted = [...scored].sort((a, b) => {
    switch (profile.sort) {
      case 'newest':
        return new Date(b.job.postedAt).getTime() - new Date(a.job.postedAt).getTime();
      case 'salary': {
        const sa = salaryAnnualEur(a.job), sb = salaryAnnualEur(b.job);
        return sb - sa;
      }
      case 'closing':
        return (a.job.expiresAt ? new Date(a.job.expiresAt).getTime() : Infinity)
          - (b.job.expiresAt ? new Date(b.job.expiresAt).getTime() : Infinity);
      case 'best':
      default:
        return b.score - a.score
          || new Date(b.job.postedAt).getTime() - new Date(a.job.postedAt).getTime();
    }
  });
  stages.push(stage('Sorting', sorted.length, performance.now() - s));

  // new-since-last
  const prev = new Set(opts.previousJobIds ?? []);
  const isNew = sorted.map((x) => prev.size > 0 && !prev.has(x.job.id));
  const newSinceLast = isNew.filter(Boolean).length;
  const strongMatches = sorted.filter((x) => x.score >= 70).length;

  // empty-state relaxation hints
  const hints = sorted.length === 0 && !empty
    ? buildRelaxHints(profile, active, admin)
    : [];

  const diagnostics: SearchDiagnostics = {
    filtersApplied,
    sourcesSearched,
    fetched,
    duplicates: mergedCount,
    hardFilterRejected: hardRejected,
    expired,
    candidates: sorted.length,
    highRelevance: strongMatches,
    stages,
  };

  void groups;
  void t0;

  return {
    jobs: sorted,
    total: sorted.length,
    newSinceLast,
    strongMatches,
    diagnostics,
    hints,
    isNew,
  };
}

function sourceIdOf(job: Job): string {
  return job.source.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function salaryAnnualEur(job: Job): number {
  if (job.salaryMax == null || !job.salaryCurrency) return -1;
  return convertSalary(annualize(job.salaryMax, job.salaryPeriod ?? 'annual'), job.salaryCurrency, 'EUR');
}

/* ---------- empty-state relaxation hints ---------- */

function buildRelaxHints(profile: SearchProfile, pool: Job[], admin: AdminConfig): RelaxHint[] {
  const hints: RelaxHint[] = [];
  // NOTE: keep the current minScore for gain computation (except the score
  // relaxer itself) so each hint promises only what applying it really unlocks.
  const base = { ...profile };

  const relaxers: { id: string; label: string; description: string; apply: Partial<SearchProfile> }[] = [];

  if (profile.minScore > 0) {
    const next = profile.minScore > 70 ? 70 : profile.minScore > 50 ? 50 : 0;
    relaxers.push({
      id: 'score', label: `Lower minimum match to ${next}%`,
      description: 'Show promising jobs with a slightly lower match score.',
      apply: { minScore: next },
    });
  }
  const reqLang = profile.languages.find((l) => l.level === 'required');
  if (reqLang) {
    relaxers.push({
      id: 'lang', label: `Make “${reqLang.language}” preferred instead of required`,
      description: 'Keep the language as a soft signal instead of a hard requirement.',
      apply: { languages: profile.languages.map((l) => l.level === 'required' ? { ...l, level: 'preferred' as const } : l), hardFilters: profile.hardFilters.filter((h) => h !== 'language') },
    });
  }
  if (profile.datePosted !== 'any') {
    const next = profile.datePosted === '24h' ? '7d' : profile.datePosted === '3d' ? '14d' : profile.datePosted === '7d' ? '30d' : 'any';
    relaxers.push({
      id: 'date', label: `Expand date from ${profile.datePosted} to ${next}`,
      description: 'Include slightly older postings.',
      apply: { datePosted: next as SearchProfile['datePosted'] },
    });
  }
  if (profile.remote.includes('remote') || profile.remote.some((r) => r.startsWith('remote_'))) {
    relaxers.push({
      id: 'hybrid', label: 'Include hybrid roles',
      description: 'Hybrid roles often allow mostly-remote work.',
      apply: { remote: [...profile.remote, 'hybrid'] },
    });
  }
  if (profile.salaryMin != null) {
    relaxers.push({
      id: 'salary', label: 'Remove the minimum salary',
      description: 'Many great roles hide compensation until later stages.',
      apply: { salaryMin: undefined, salaryOnlyDisclosed: false },
    });
  }
  if (profile.excludedTitles.length) {
    relaxers.push({
      id: 'excl', label: `Remove exclusions (${profile.excludedTitles.slice(0, 2).join(', ')})`,
      description: 'Excluded titles may hide adjacent opportunities.',
      apply: { excludedTitles: [] },
    });
  }

  for (const r of relaxers) {
    const relaxed = { ...base, ...r.apply };
    const res = runSearchLight(relaxed, pool, admin);
    if (res > 0) hints.push({ ...r, gain: res });
  }
  return hints.sort((a, b) => b.gain - a.gain).slice(0, 4);
}

/** Lightweight count-only pass for hint computation (no dedup re-run). */
function runSearchLight(profile: SearchProfile, pool: Job[], admin: AdminConfig): number {
  let n = 0;
  for (const j of pool) {
    if (j.status === 'CLOSED') continue;
    const s = scoreJob(j, { ...profile, weights: admin.weights });
    if (s.hardFailed.length) continue;
    if (s.score < (profile.minScore ?? 0)) continue;
    n++;
  }
  return n;
}

export function maxJobAgeOk(job: Job, maxDays: number): boolean {
  return daysSince(job.postedAt) <= maxDays;
}
