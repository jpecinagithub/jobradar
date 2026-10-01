/* JOBRADAR — deduplication engine.
   Same vacancy can appear on LinkedIn, Indeed, Impactpool, company site, Workday…
   We group duplicates and keep the single most-original source. */

import type { DuplicateGroup, Job } from './types';
import { SOURCE_PRIORITY } from './types';
import { fuzzyTitleMatch, normalizeTitle, daysSince } from './normalize';

export interface DedupOptions {
  threshold?: number; // 0-100 confidence to merge (default 72)
}

function companyKey(company: string): string {
  return company.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function locationKey(job: Job): string {
  return [job.city, job.country].filter(Boolean).join('|').toLowerCase();
}

/**
 * duplicateConfidence 0-100 that two postings are the same vacancy.
 * Signals: ATS/external id match, title similarity, company, location,
 * date proximity, description overlap.
 */
export function duplicateConfidence(a: Job, b: Job): number {
  // Hard identifiers: same ATS id or external id = same job
  if (a.ats && b.ats && a.ats === b.ats && a.atsJobId && a.atsJobId === b.atsJobId) return 99;
  if (a.externalId && b.externalId && a.externalId === b.externalId) return 99;

  let score = 0;

  // Title (40)
  const titleSim = fuzzyTitleMatch(a.title, b.title);
  score += titleSim * 40;

  // Company (25)
  const ca = companyKey(a.company), cb = companyKey(b.company);
  if (ca && cb) {
    if (ca === cb) score += 25;
    else if (ca.includes(cb) || cb.includes(ca)) score += 18;
  }

  // Location (15)
  const la = locationKey(a), lb = locationKey(b);
  if (la && lb) {
    if (la === lb) score += 15;
    else if (a.country && b.country && a.country.toLowerCase() === b.country.toLowerCase()) score += 9;
  } else if (a.remoteType !== 'on_site' && b.remoteType !== 'on_site') {
    score += 8;
  }

  // Date proximity (10): same vacancy usually discovered within days
  const dateDiff = Math.abs(daysSince(a.postedAt) - daysSince(b.postedAt));
  if (dateDiff <= 2) score += 10;
  else if (dateDiff <= 7) score += 6;
  else if (dateDiff <= 21) score += 2;

  // Description overlap (10)
  const da = normalizeTitle(a.description.slice(0, 2000));
  const db = normalizeTitle(b.description.slice(0, 2000));
  if (da.length > 100 && db.length > 100) {
    const wa = new Set(da.split(' '));
    const wb = new Set(db.split(' '));
    let inter = 0;
    for (const w of wa) if (wb.has(w)) inter++;
    const overlap = (2 * inter) / (wa.size + wb.size);
    score += overlap * 10;
  }

  return Math.min(100, Math.round(score));
}

/** Rank candidate canonical: most original source first, then newest verification. */
function canonicalRank(job: Job): number {
  return SOURCE_PRIORITY[job.sourceType] ?? 9;
}

/**
 * Group duplicates. Returns groups; jobs not in any group stay standalone.
 * Greedy clustering: each job joins the first group whose canonical passes threshold.
 */
export function findDuplicateGroups(jobs: Job[], opts: DedupOptions = {}): DuplicateGroup[] {
  const threshold = opts.threshold ?? 72;
  const groups: DuplicateGroup[] = [];
  const assigned = new Set<string>();

  const sorted = [...jobs].sort((a, b) => canonicalRank(a) - canonicalRank(b));

  for (const job of sorted) {
    if (assigned.has(job.id)) continue;
    let placed = false;
    for (const g of groups) {
      const conf = duplicateConfidence(job, g.canonical);
      if (conf >= threshold) {
        g.members.push({ job, confidence: conf });
        const sources = new Set(g.allSources);
        sources.add(job.source);
        g.allSources = [...sources];
        assigned.add(job.id);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push({
        id: `dg_${job.id}`,
        canonical: job,
        members: [],
        allSources: [job.source],
      });
      assigned.add(job.id);
    }
  }
  return groups;
}

/** Collapse to unique jobs, annotating each canonical with its duplicate group. */
export function dedupJobs(
  jobs: Job[],
  opts: DedupOptions = {},
): { unique: Job[]; groups: DuplicateGroup[]; mergedCount: number } {
  const groups = findDuplicateGroups(jobs, opts);
  const unique: Job[] = [];
  let mergedCount = 0;
  for (const g of groups) {
    if (g.members.length > 0) {
      // keep the most original source as canonical
      const candidates = [g.canonical, ...g.members.map((m) => m.job)];
      candidates.sort((a, b) => canonicalRank(a) - canonicalRank(b));
      const best = candidates[0];
      const others = candidates.slice(1).map((job) => ({
        job,
        confidence: duplicateConfidence(job, best),
      }));
      g.canonical = best;
      g.members = others;
      g.allSources = [...new Set(candidates.map((c) => c.source))];
      best.duplicateGroupId = g.id;
      unique.push(best);
      mergedCount += others.length;
    } else {
      unique.push(g.canonical);
    }
  }
  return { unique, groups, mergedCount };
}
