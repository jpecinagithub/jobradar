/* JOBRADAR — matching engine.
   Hard filters exclude; soft filters score. Score is explainable:
   each dimension contributes its weight, traceable per job. */

import type {
  HardFilterKey, Job, MatchTrace, ScoreBreakdown, ScoredJob,
  SearchProfile, TraceCheck,
} from './types';
import { DEFAULT_WEIGHTS } from './types';
import { locationMatchesCountry, isRemoteToken } from './geo';
import {
  annualize, convertSalary, datePostedCutoff, daysSince,
  fuzzyTitleMatch, seniorityRank,
} from './normalize';
import { isExcludedMeaning, titleRelated, titleVariants } from './synonyms';

function hasCriteria(p: SearchProfile): boolean {
  return !!(
    p.titles.length || p.exactTitles.length || p.mustKeywords.length ||
    p.shouldKeywords.length || p.locations.length || p.remote.length ||
    p.functions.length || p.industries.length || p.seniority.length ||
    p.languages.length || p.experienceMin != null || p.companies.length ||
    p.employmentTypes.length || p.salaryMin != null
  );
}

const norm = (s: string) => s.toLowerCase();

function textHaystack(job: Job): string {
  return norm(`${job.title} ${job.description} ${job.requirements.join(' ')} ${job.skills.join(' ')}`);
}

/* ---------------- title ---------------- */

function scoreTitle(job: Job, p: SearchProfile, checks: TraceCheck[]): number {
  if (!p.titles.length && !p.exactTitles.length) return 0.6; // neutral when no title criteria
  const jt = job.title;

  // exact titles: hard win / hard miss handled by hard filter elsewhere; here score
  if (p.exactTitles.length) {
    const hit = p.exactTitles.some((t) => norm(jt) === norm(t) || norm(jt).includes(norm(t)));
    checks.push({ label: `Exact title “${p.exactTitles[0]}”`, status: hit ? 'pass' : 'fail' });
    return hit ? 1 : 0;
  }

  let best = 0;
  let bestLabel = '';
  for (const wanted of p.titles) {
    if (isExcludedMeaning(wanted, jt)) {
      checks.push({ label: `Excluded meaning of “${wanted}”`, status: 'fail', detail: jt });
      return 0;
    }
    for (const variant of titleVariants(wanted)) {
      const s = fuzzyTitleMatch(jt, variant);
      if (s > best) { best = s; bestLabel = variant; }
    }
    for (const rel of titleRelated(wanted)) {
      const s = fuzzyTitleMatch(jt, rel) * 0.7;
      if (s > best) { best = s; bestLabel = `${rel} (related)`; }
    }
  }
  checks.push({
    label: best >= 0.75 ? `Title match “${bestLabel}”` : `Title similarity ${Math.round(best * 100)}%`,
    status: best >= 0.75 ? 'pass' : best >= 0.45 ? 'warn' : 'fail',
  });
  return best;
}

/* ---------------- location ---------------- */

function scoreLocation(job: Job, p: SearchProfile, checks: TraceCheck[]): number {
  if (!p.locations.length && !p.excludedLocations.length) return 0.6;

  // excluded locations always hurt
  if (p.excludedLocations.length && job.country && locationMatchesCountry(job.country, p.excludedLocations)) {
    checks.push({ label: 'Excluded location', status: 'fail', detail: job.country });
    return 0;
  }

  const tokens = p.locations.filter((t) => !isRemoteToken(t));
  if (!tokens.length) return 0.6;

  if (job.remoteType !== 'on_site' && !job.country) {
    // fully remote with no country: match if user asked any non-remote location? neutral
    checks.push({ label: 'Remote — location flexible', status: 'warn' });
    return 0.7;
  }
  const hit = job.country ? locationMatchesCountry(job.country, tokens) : false;
  checks.push({
    label: hit ? `Location ${job.city ?? ''} ${job.country ?? ''}`.trim() : `Not in ${tokens.slice(0, 3).join(', ')}`,
    status: hit ? 'pass' : 'fail',
  });
  return hit ? 1 : 0;
}

/* ---------------- work model / remote ---------------- */

function scoreWorkModel(job: Job, p: SearchProfile, checks: TraceCheck[]): number {
  if (!p.remote.length) return 0.6;
  const jt = job.remoteType;
  const wants = p.remote;
  const isRemoteJob = jt !== 'on_site' && jt !== 'hybrid';

  // direct hit
  if (wants.includes(jt)) {
    checks.push({ label: 'Work model match', status: 'pass' });
    return 1;
  }
  // remote family compat: asking "remote" accepts any remote flavor
  if (wants.includes('remote') && isRemoteJob) {
    checks.push({ label: 'Remote match', status: 'pass' });
    return 1;
  }
  if (wants.includes('hybrid') && jt === 'on_site') {
    checks.push({ label: 'On-site only, hybrid wanted', status: 'warn' });
    return 0.35;
  }
  if ((wants.includes('remote') || wants.some((r) => r.startsWith('remote_'))) && !isRemoteJob) {
    checks.push({ label: 'Not remote', status: 'fail' });
    return 0;
  }
  // remote_from_country restriction
  if (p.remoteFromCountry && isRemoteJob && job.eligibleRemoteCountries?.length) {
    const ok = job.eligibleRemoteCountries.some((c) => norm(c) === norm(p.remoteFromCountry!));
    checks.push({ label: ok ? `Remote eligible from ${p.remoteFromCountry}` : `Remote not eligible from ${p.remoteFromCountry}`, status: ok ? 'pass' : 'fail' });
    return ok ? 1 : 0;
  }
  checks.push({ label: 'Work model partial', status: 'warn' });
  return 0.5;
}

/* ---------------- skills / keywords ---------------- */

function scoreSkills(job: Job, p: SearchProfile, checks: TraceCheck[]): number {
  const hay = textHaystack(job);
  const must = p.mustKeywords, should = p.shouldKeywords;

  if (!must.length && !should.length) return 0.6;

  // must-have handled as hard signal in scoring too (hard filter may exclude)
  let mustHit = 0;
  for (const k of must) {
    if (hay.includes(norm(k))) mustHit++;
    else checks.push({ label: `Missing must-have “${k}”`, status: 'fail' });
  }
  const mustScore = must.length ? mustHit / must.length : 1;

  let shouldHit = 0;
  for (const k of should) if (hay.includes(norm(k))) shouldHit++;
  const shouldScore = should.length ? shouldHit / should.length : 0.6;
  if (should.length) {
    checks.push({
      label: `${shouldHit}/${should.length} nice-to-have skills`,
      status: shouldHit === should.length ? 'pass' : shouldHit > 0 ? 'warn' : 'fail',
    });
  }
  return mustScore * 0.7 + shouldScore * 0.3;
}

/* ---------------- experience ---------------- */

function scoreExperience(job: Job, p: SearchProfile, checks: TraceCheck[]): number {
  if (p.experienceMin == null && p.experienceMax == null) return 0.6;
  const jMin = job.experienceMin ?? 0;
  const jMax = job.experienceMax ?? 99;
  const pMin = p.experienceMin ?? 0;
  const pMax = p.experienceMax ?? 99;
  // overlap of ranges
  const overlap = Math.max(0, Math.min(jMax, pMax) - Math.max(jMin, pMin));
  const s = overlap > 0 ? 1 : Math.max(0, 1 - Math.min(4, Math.abs(jMin - pMin)) / 4) * 0.5;
  checks.push({
    label: overlap > 0
      ? `Experience ${jMin}+ years`
      : `Experience mismatch (job ${jMin}+ vs wanted ${pMin}+)`,
    status: overlap > 0 ? 'pass' : 'warn',
  });
  return Math.min(1, s + (overlap > 0 ? 0 : 0));
}

/* ---------------- language ---------------- */

function scoreLanguage(job: Job, p: SearchProfile, checks: TraceCheck[]): number {
  if (!p.languages.length) return 0.6;
  let total = 0, weight = 0;
  for (const req of p.languages) {
    const L = norm(req.language);
    const inReq = job.languagesRequired.some((l) => norm(l) === L);
    const inPref = job.languagesPreferred.some((l) => norm(l) === L);
    if (req.level === 'required') {
      weight += 2;
      if (inReq) { total += 2; checks.push({ label: `${req.language} required ✓`, status: 'pass' }); }
      else if (inPref) { total += 1; checks.push({ label: `${req.language} preferred, not required`, status: 'warn' }); }
      else if (job.languageConfidence === 'UNKNOWN') { total += 1; checks.push({ label: `${req.language} not mentioned`, status: 'warn' }); }
      else { checks.push({ label: `${req.language} required ✕`, status: 'fail' }); }
    } else if (req.level === 'preferred') {
      weight += 1;
      if (inReq || inPref) { total += 1; checks.push({ label: `${req.language} preferred ✓`, status: 'pass' }); }
      else { total += 0.4; checks.push({ label: `${req.language} not mentioned`, status: 'warn' }); }
    } else if (req.level === 'optional') {
      weight += 0.5;
      total += (inReq || inPref) ? 0.5 : 0.25;
    } else if (req.level === 'exclude_if_mandatory') {
      weight += 1.5;
      if (inReq) { checks.push({ label: `${req.language} mandatory — excluded`, status: 'fail' }); }
      else { total += 1.5; checks.push({ label: `${req.language} not mandatory ✓`, status: 'pass' }); }
    }
  }
  return weight ? total / weight : 0.6;
}

/* ---------------- industry / seniority ---------------- */

function scoreIndustry(job: Job, p: SearchProfile, checks: TraceCheck[]): number {
  if (!p.industries.length) return 0.6;
  const hit = job.industry.some((i) => p.industries.some((w) => norm(i) === norm(w)));
  checks.push({ label: hit ? `Industry ${job.industry[0]}` : 'Industry not listed', status: hit ? 'pass' : 'warn' });
  return hit ? 1 : 0.3;
}

function scoreSeniority(job: Job, p: SearchProfile, checks: TraceCheck[]): number {
  if (!p.seniority.length) return 0.6;
  const jr = seniorityRank(job.seniority);
  const dist = Math.min(...p.seniority.map((s) => Math.abs(seniorityRank(s) - jr)));
  const hit = dist === 0;
  checks.push({
    label: hit ? `Seniority ${job.seniority}` : `Seniority ${job.seniority} (near miss)`,
    status: hit ? 'pass' : dist <= 1 ? 'warn' : 'fail',
  });
  return hit ? 1 : dist === 1 ? 0.6 : 0.25;
}

/* ---------------- hard filters ---------------- */

function hardFilterFailures(job: Job, p: SearchProfile): string[] {
  const failed: string[] = [];
  const hard = new Set<HardFilterKey>(p.hardFilters);

  if (hard.has('location') && p.locations.length) {
    const tokens = p.locations.filter((t) => !isRemoteToken(t));
    if (tokens.length && job.country && !locationMatchesCountry(job.country, tokens)) {
      failed.push('location');
    }
  }
  if (hard.has('remote') && p.remote.length) {
    if (scoreWorkModel(job, p, []) < 0.5) failed.push('remote');
  }
  if (hard.has('language')) {
    for (const req of p.languages) {
      if (req.level !== 'required') continue;
      const L = norm(req.language);
      const ok = job.languagesRequired.some((l) => norm(l) === L)
        || (job.languageConfidence === 'UNKNOWN');
      if (!ok) { failed.push('language'); break; }
    }
    for (const req of p.languages) {
      if (req.level !== 'exclude_if_mandatory') continue;
      const L = norm(req.language);
      if (job.languagesRequired.some((l) => norm(l) === L)) { failed.push('language'); break; }
    }
  }
  if (hard.has('salary') && p.salaryMin != null) {
    if (job.salaryMax != null && job.salaryCurrency) {
      const annual = annualize(job.salaryMax, job.salaryPeriod ?? 'annual');
      const eur = convertSalary(annual, job.salaryCurrency, 'EUR');
      const wantEur = convertSalary(p.salaryMin, p.salaryCurrency, 'EUR');
      if (eur < wantEur) failed.push('salary');
    } else {
      // never invent salary: without disclosed, convertible compensation the minimum cannot be verified
      failed.push('salary');
    }
  }
  if (hard.has('visa') && p.visaSponsorship) {
    if (job.visaSponsorship === 'not_mentioned') failed.push('visa');
  }
  if (hard.has('date') && p.datePosted !== 'any') {
    const cutoff = datePostedCutoff(p.datePosted);
    if (cutoff != null && daysSince(job.postedAt) > cutoff) failed.push('date');
  }
  if (hard.has('title') && (p.titles.length || p.exactTitles.length)) {
    // excluded meanings score 0 inside scoreTitle; weak similarities (<0.45) fail
    const titleScore = scoreTitle(job, p, []);
    if (titleScore < 0.45) failed.push('title');
  }
  if (hard.has('seniority') && p.seniority.length) {
    if (!p.seniority.includes(job.seniority)) failed.push('seniority');
  }
  // must-not keywords & excluded titles/companies are ALWAYS hard
  const hay = textHaystack(job);
  if (p.mustNotKeywords.some((k) => hay.includes(norm(k)))) failed.push('excluded keyword');
  if (p.excludedTitles.some((t) => fuzzyTitleMatch(job.title, t) > 0.8)) failed.push('excluded title');
  if (p.excludedCompanies.some((c) => norm(job.company).includes(norm(c)))) failed.push('excluded company');

  return failed;
}

/* ---------------- main entry ---------------- */

export function scoreJob(job: Job, profile: SearchProfile): ScoredJob {
  const p = profile;
  const weights: ScoreBreakdown = { ...DEFAULT_WEIGHTS, ...p.weights };
  const checks: TraceCheck[] = [];
  const hardFailed = hardFilterFailures(job, p);

  const matchedSynonyms: string[] = [];
  for (const t of p.titles) {
    const e = titleVariants(t).find((v) => fuzzyTitleMatch(job.title, v) > 0.7);
    if (e && norm(e) !== norm(job.title)) matchedSynonyms.push(`${t} → ${e}`);
  }

  const breakdown: ScoreBreakdown = {
    title: scoreTitle(job, p, checks),
    location: scoreLocation(job, p, checks),
    skills: scoreSkills(job, p, checks),
    experience: scoreExperience(job, p, checks),
    language: scoreLanguage(job, p, checks),
    industry: scoreIndustry(job, p, checks),
    seniority: scoreSeniority(job, p, checks),
    workModel: scoreWorkModel(job, p, checks),
  };

  const wSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  let total = 0;
  (Object.keys(breakdown) as (keyof ScoreBreakdown)[]).forEach((k) => {
    total += breakdown[k] * (weights[k] / wSum);
  });

  // hard failures zero the score (job excluded upstream, but keep the signal)
  const score = hardFailed.length ? 0 : Math.round(total * 100);

  const trace: MatchTrace = {
    retrievedFrom: job.source,
    normalizedTitle: job.normalizedTitle,
    matchedSynonyms,
    checks,
    score,
  };

  // scale breakdown to display points
  const display: ScoreBreakdown = { ...breakdown };
  (Object.keys(display) as (keyof ScoreBreakdown)[]).forEach((k) => {
    display[k] = Math.round(breakdown[k] * weights[k]);
  });

  return { job, score, breakdown: display, trace, hardFailed };
}

export function isEmptyProfile(p: SearchProfile): boolean {
  return !hasCriteria(p);
}
