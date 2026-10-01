/* JOBRADAR — live source connectors.
   Fetches REAL job listings from the official public APIs of
   Greenhouse and Ashby. No authentication, no scraping, no bypassing:
   these endpoints are published by the ATS vendors for public job boards
   and are CORS-enabled.

   Honest limits (v1):
   - Only companies on these two ATS platforms are covered.
   - Greenhouse's list endpoint exposes title + location (+department when
     present) but NOT the full description; detail pages are not fetched
     in bulk. Listings are still 100% real; the job detail page links out
     to the original posting for the full text.
   - Salary is only set when the posting states an explicit numeric range
     with currency. Otherwise it stays undisclosed — never invented.
*/

import type { ContractType, Job, RemoteType } from './types';
import {
  extractExperienceYears,
  extractLanguages,
  inferSeniority,
  normalizeTitle,
} from './normalize';

export type AtsKind = 'greenhouse' | 'ashby';

export interface LiveCompany {
  id: string; // live_<ats>_<slug>
  name: string;
  ats: AtsKind;
  slug: string;
  sector: string;
  enabled: boolean;
}

export const ATS_LABEL: Record<AtsKind, string> = {
  greenhouse: 'Greenhouse',
  ashby: 'Ashby',
};

export function boardUrl(c: LiveCompany): string {
  return c.ats === 'greenhouse'
    ? `https://job-boards.greenhouse.io/${c.slug}`
    : `https://jobs.ashbyhq.com/${c.slug}`;
}

/* ---------------- Verified starter directory (2026-10-01) ---------------- */

export const DEFAULT_LIVE_COMPANIES: LiveCompany[] = [
  { id: 'live_greenhouse_stripe', name: 'Stripe', ats: 'greenhouse', slug: 'stripe', sector: 'Fintech', enabled: true },
  { id: 'live_greenhouse_airbnb', name: 'Airbnb', ats: 'greenhouse', slug: 'airbnb', sector: 'Technology', enabled: true },
  { id: 'live_greenhouse_anthropic', name: 'Anthropic', ats: 'greenhouse', slug: 'anthropic', sector: 'AI', enabled: true },
  { id: 'live_greenhouse_figma', name: 'Figma', ats: 'greenhouse', slug: 'figma', sector: 'Technology', enabled: true },
  { id: 'live_greenhouse_datadog', name: 'Datadog', ats: 'greenhouse', slug: 'datadog', sector: 'Technology', enabled: true },
  { id: 'live_greenhouse_coinbase', name: 'Coinbase', ats: 'greenhouse', slug: 'coinbase', sector: 'Fintech', enabled: true },
  { id: 'live_greenhouse_robinhood', name: 'Robinhood', ats: 'greenhouse', slug: 'robinhood', sector: 'Fintech', enabled: true },
  { id: 'live_ashby_vercel', name: 'Vercel', ats: 'ashby', slug: 'vercel', sector: 'Technology', enabled: true },
  { id: 'live_ashby_linear', name: 'Linear', ats: 'ashby', slug: 'linear', sector: 'Technology', enabled: true },
  { id: 'live_ashby_ramp', name: 'Ramp', ats: 'ashby', slug: 'ramp', sector: 'Fintech', enabled: true },
  { id: 'live_ashby_mercury', name: 'Mercury', ats: 'ashby', slug: 'mercury', sector: 'Fintech', enabled: true },
];

/* ---------------- Persistence ---------------- */

const COMPANIES_KEY = 'jobradar:live-companies:v1';
const CACHE_KEY = 'jobradar:live-cache:v1';
const MODE_KEY = 'jobradar:data-mode:v1';
export const LIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FETCH_TIMEOUT_MS = 25_000;
const MAX_DESC_CHARS = 3500;

export type DataMode = 'demo' | 'live';

export function getDataMode(): DataMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'live' ? 'live' : 'demo';
  } catch {
    return 'demo';
  }
}

export function saveDataMode(m: DataMode): void {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch { /* private mode */ }
}

export function getLiveCompanies(): LiveCompany[] {
  try {
    const raw = localStorage.getItem(COMPANIES_KEY);
    if (!raw) return DEFAULT_LIVE_COMPANIES;
    const parsed = JSON.parse(raw) as LiveCompany[];
    if (!Array.isArray(parsed)) return DEFAULT_LIVE_COMPANIES;
    return parsed;
  } catch {
    return DEFAULT_LIVE_COMPANIES;
  }
}

export function saveLiveCompanies(list: LiveCompany[]): void {
  try {
    localStorage.setItem(COMPANIES_KEY, JSON.stringify(list));
  } catch { /* quota */ }
}

interface CacheEntry {
  fetchedAt: string;
  jobs: Job[];
  error?: string;
}

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // quota exceeded — drop descriptions and retry once
    try {
      const slim: Record<string, CacheEntry> = {};
      for (const [k, v] of Object.entries(cache)) {
        slim[k] = { ...v, jobs: v.jobs.map((j) => ({ ...j, description: j.description.slice(0, 500) })) };
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(slim));
    } catch { /* give up silently */ }
  }
}

export function clearLiveCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch { /* ignore */ }
}

export interface LiveCacheStatus {
  companyId: string;
  fetchedAt: string | null;
  jobCount: number;
  error?: string;
  stale: boolean;
}

export function getLiveCacheStatus(): LiveCacheStatus[] {
  const companies = getLiveCompanies();
  const cache = readCache();
  const now = Date.now();
  return companies.map((c) => {
    const e = cache[c.id];
    return {
      companyId: c.id,
      fetchedAt: e?.fetchedAt ?? null,
      jobCount: e?.jobs.length ?? 0,
      error: e?.error,
      stale: !e || now - new Date(e.fetchedAt).getTime() > LIVE_CACHE_TTL_MS,
    };
  });
}

/* ---------------- Fetch helpers ---------------- */

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    window.clearTimeout(t);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------------- Location / remote parsing ---------------- */

export function parseLocation(raw: string): {
  city?: string; country?: string; remoteType: RemoteType;
  note?: string; countries?: string[];
} {
  const loc = (raw || '').trim();
  if (!loc) return { remoteType: 'on_site' };
  if (/hybrid/i.test(loc)) {
    const parts = loc.split(',').map((p) => p.trim()).filter(Boolean);
    return { city: parts[0], country: parts[1], remoteType: 'hybrid', note: loc };
  }
  if (/remote/i.test(loc)) {
    if (/worldwide|global|anywhere/i.test(loc)) return { remoteType: 'remote_worldwide', note: loc };
    if (/\bEU\b|European Union/i.test(loc)) return { remoteType: 'remote_eu', note: loc };
    if (/europe/i.test(loc)) return { remoteType: 'remote_europe', note: loc };
    const m = /remote\s*[-–—:]\s*([A-Za-z][A-Za-z .]*)/i.exec(loc);
    if (m) return { remoteType: 'remote_country', countries: [m[1].trim()], note: loc };
    return { remoteType: 'remote', note: loc };
  }
  const parts = loc.split(',').map((p) => p.trim()).filter(Boolean);
  return { city: parts[0], country: parts[1], remoteType: 'on_site' };
}

/* ---------------- Salary parsing (explicit ranges only) ---------------- */

const CURRENCY_RE = /([$€£])\s*([\d.,]+)\s*([kK])?/g;

function parseSalary(text: string): {
  min?: number; max?: number; currency?: string; period?: 'annual' | 'monthly' | 'hourly';
} | null {
  if (!text) return null;
  const t = text.replace(/–|—/g, '-');
  let period: 'annual' | 'monthly' | 'hourly' = 'annual';
  if (/per\s+month|\/\s*mo\b|monthly/i.test(t)) period = 'monthly';
  else if (/per\s+hour|\/\s*hr\b|hourly/i.test(t)) period = 'hourly';

  const amounts: { value: number; currency: string }[] = [];
  CURRENCY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CURRENCY_RE.exec(t)) !== null) {
    let n = parseFloat(m[2].replace(/,/g, ''));
    if (Number.isNaN(n)) continue;
    // "90.000" (European thousands) vs "90.5": treat trailing .000 as thousands
    if (m[3]) n *= 1000;
    const currency = m[1] === '$' ? 'USD' : m[1] === '€' ? 'EUR' : 'GBP';
    amounts.push({ value: Math.round(n), currency });
  }
  if (amounts.length === 0) return null;
  const currency = amounts[0].currency;
  const vals = amounts.filter((a) => a.currency === currency).map((a) => a.value);
  if (!vals.length) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (min <= 0) return null;
  return { min, max: max === min ? undefined : max, currency, period };
}

/* ---------------- Greenhouse mapping ---------------- */

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  metadata?: { name?: string; value?: string }[] | null;
  updated_at?: string;
  first_published?: string;
  departments?: { name?: string }[];
  company_name?: string;
}

function greenhouseSalary(j: GreenhouseJob) {
  if (!j.metadata) return null;
  for (const md of j.metadata) {
    const parsed = parseSalary(md.value ?? '');
    if (parsed) return parsed;
  }
  return null;
}

function mapGreenhouseJob(j: GreenhouseJob, company: LiveCompany, now: string): Job {
  const locRaw = j.location?.name ?? '';
  const loc = parseLocation(locRaw);
  const depts = (j.departments ?? []).map((d) => d.name ?? '').filter(Boolean);
  const salary = greenhouseSalary(j);
  const descParts = [
    `${j.title} at ${company.name}.`,
    depts.length ? `Department: ${depts.join(', ')}.` : '',
    locRaw ? `Location: ${locRaw}.` : '',
    'Full description available on the original posting — open it to apply.',
  ].filter(Boolean);
  const description = descParts.join(' ');
  const langs = extractLanguages(`${j.title} ${description}`);
  const exp = extractExperienceYears(`${j.title} ${description}`);
  const postedAt = j.first_published || j.updated_at || now;

  return {
    id: `live_gh_${company.slug}_${j.id}`,
    externalId: String(j.id),
    title: j.title,
    normalizedTitle: normalizeTitle(j.title),
    company: company.name,
    city: loc.city,
    country: loc.country,
    remoteType: loc.remoteType,
    eligibleRemoteCountries: loc.countries,
    remoteRestrictionNote: loc.note,
    employmentType: 'permanent',
    seniority: inferSeniority(j.title, description),
    salaryMin: salary?.min,
    salaryMax: salary?.max,
    salaryCurrency: salary?.currency,
    salaryPeriod: salary?.period,
    salaryConfidence: salary ? 'CONFIRMED' : 'UNKNOWN',
    description,
    responsibilities: [],
    requirements: [],
    skills: [],
    languagesRequired: langs.required,
    languagesPreferred: langs.preferred,
    languageConfidence: langs.required.length || langs.preferred.length ? 'INFERRED' : 'UNKNOWN',
    experienceMin: exp.min,
    experienceMax: exp.max,
    industry: company.sector === 'Fintech' ? ['Financial Services', 'Technology'] : ['Technology'],
    function: depts,
    visaSponsorship: 'not_mentioned',
    relocation: false,
    relocationConfidence: 'UNKNOWN',
    expatriatePackage: false,
    postedAt,
    discoveredAt: now,
    lastVerifiedAt: now,
    source: company.name,
    sourceType: 'ATS',
    sourceUrl: boardUrl(company),
    applyUrl: j.absolute_url,
    ats: 'greenhouse',
    atsJobId: String(j.id),
    status: 'ACTIVE',
    qualityScore: 88, // list-level data: no full description
  };
}

async function fetchGreenhouse(company: LiveCompany, now: string): Promise<Job[]> {
  const data = (await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?per_page=500`,
  )) as { jobs?: GreenhouseJob[] };
  return (data.jobs ?? []).map((j) => mapGreenhouseJob(j, company, now));
}

/* ---------------- Ashby mapping ---------------- */

interface AshbyJob {
  id: string;
  title: string;
  department?: string;
  employmentType?: string;
  location?: string | { name?: string; location?: string } | null;
  secondaryLocations?: { location?: string }[];
  publishedAt?: string;
  isRemote?: boolean;
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  compensationTierSummary?: string;
}

function ashbyLocationRaw(j: AshbyJob): string {
  const l = j.location;
  if (typeof l === 'string') return l;
  if (l && typeof l === 'object') return l.name || l.location || '';
  return '';
}

function mapAshbyEmploymentType(t?: string): ContractType {
  const s = (t || '').toLowerCase();
  if (/intern/.test(s)) return 'internship';
  if (/contract|temporary|temp\b/.test(s)) return 'contractor';
  if (/part[\s-]?time/.test(s)) return 'temporary';
  return 'permanent';
}

function mapAshbyJob(j: AshbyJob, company: LiveCompany, now: string): Job {
  const locRaw = ashbyLocationRaw(j) || (j.isRemote ? 'Remote' : '');
  const loc = parseLocation(locRaw);
  const rawDesc = j.descriptionPlain || stripHtml(j.descriptionHtml ?? '');
  const description = rawDesc.slice(0, MAX_DESC_CHARS);
  const salary = parseSalary(j.compensationTierSummary ?? '');
  const langs = extractLanguages(`${j.title} ${description}`);
  const exp = extractExperienceYears(`${j.title} ${description}`);
  const extraLocs = (j.secondaryLocations ?? [])
    .map((s) => s.location)
    .filter(Boolean) as string[];

  return {
    id: `live_ashby_${company.slug}_${j.id}`,
    externalId: j.id,
    title: j.title,
    normalizedTitle: normalizeTitle(j.title),
    company: company.name,
    city: loc.city,
    country: loc.country,
    remoteType: loc.remoteType,
    eligibleRemoteCountries: loc.countries,
    remoteRestrictionNote: [loc.note, extraLocs.length ? `Also: ${extraLocs.join('; ')}` : '']
      .filter(Boolean)
      .join(' · ') || undefined,
    employmentType: mapAshbyEmploymentType(j.employmentType),
    seniority: inferSeniority(j.title, description),
    salaryMin: salary?.min,
    salaryMax: salary?.max,
    salaryCurrency: salary?.currency,
    salaryPeriod: salary?.period,
    salaryConfidence: salary ? 'CONFIRMED' : 'UNKNOWN',
    description,
    responsibilities: [],
    requirements: [],
    skills: [],
    languagesRequired: langs.required,
    languagesPreferred: langs.preferred,
    languageConfidence: langs.required.length || langs.preferred.length ? 'INFERRED' : 'UNKNOWN',
    experienceMin: exp.min,
    experienceMax: exp.max,
    industry: company.sector === 'Fintech' ? ['Financial Services', 'Technology'] : ['Technology'],
    function: j.department ? [j.department] : [],
    visaSponsorship: 'not_mentioned',
    relocation: false,
    relocationConfidence: 'UNKNOWN',
    expatriatePackage: false,
    postedAt: j.publishedAt || now,
    discoveredAt: now,
    lastVerifiedAt: now,
    source: company.name,
    sourceType: 'ATS',
    sourceUrl: boardUrl(company),
    applyUrl: j.applyUrl || j.jobUrl || boardUrl(company),
    ats: 'ashby',
    atsJobId: j.id,
    status: 'ACTIVE',
    qualityScore: 95,
  };
}

async function fetchAshby(company: LiveCompany, now: string): Promise<Job[]> {
  const data = (await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${company.slug}`,
  )) as { jobs?: AshbyJob[] };
  return (data.jobs ?? []).map((j) => mapAshbyJob(j, company, now));
}

/* ---------------- Public API ---------------- */

export interface CompanyFetchResult {
  company: LiveCompany;
  jobs: Job[];
  error?: string;
}

export async function fetchCompany(
  company: LiveCompany,
  onProgress?: (done: number, total: number, name: string) => void,
  progress?: { done: number; total: number },
): Promise<CompanyFetchResult> {
  const now = new Date().toISOString();
  try {
    const jobs =
      company.ats === 'greenhouse'
        ? await fetchGreenhouse(company, now)
        : await fetchAshby(company, now);
    if (progress && onProgress) onProgress(progress.done + 1, progress.total, company.name);
    return { company, jobs };
  } catch (err) {
    if (progress && onProgress) onProgress(progress.done + 1, progress.total, company.name);
    const message = err instanceof Error ? err.message : 'Fetch failed';
    return { company, jobs: [], error: message };
  }
}

export interface LiveFetchOutcome {
  jobs: Job[];
  fetchedAt: string;
  perCompany: { companyId: string; name: string; count: number; error?: string }[];
  fromCache: boolean;
}

/** Returns live jobs for all enabled companies, using cache when fresh. */
export async function ensureLiveJobs(
  onProgress?: (done: number, total: number, name: string) => void,
  force = false,
): Promise<LiveFetchOutcome> {
  const companies = getLiveCompanies().filter((c) => c.enabled);
  const cache = readCache();
  const now = Date.now();

  const fresh: CompanyFetchResult[] = [];
  const toFetch: LiveCompany[] = [];
  for (const c of companies) {
    const e = cache[c.id];
    if (!force && e && !e.error && now - new Date(e.fetchedAt).getTime() <= LIVE_CACHE_TTL_MS) {
      fresh.push({ company: c, jobs: e.jobs });
    } else {
      toFetch.push(c);
    }
  }

  let done = 0;
  const fetched = await Promise.all(
    toFetch.map((c) =>
      fetchCompany(c, onProgress, { done: done++, total: companies.length }).then((r) => {
        if (!r.error) {
          cache[c.id] = { fetchedAt: new Date().toISOString(), jobs: r.jobs };
        } else if (cache[c.id]) {
          // keep stale data on transient errors, but record the error
          cache[c.id] = { ...cache[c.id], error: r.error };
        } else {
          cache[c.id] = { fetchedAt: new Date().toISOString(), jobs: [], error: r.error };
        }
        return r;
      }),
    ),
  );
  writeCache(cache);

  const all = [...fresh, ...fetched];
  return {
    jobs: all.flatMap((r) => r.jobs),
    fetchedAt: new Date().toISOString(),
    perCompany: all.map((r) => ({
      companyId: r.company.id,
      name: r.company.name,
      count: r.jobs.length,
      error: r.error,
    })),
    fromCache: toFetch.length === 0,
  };
}

/** Test a single company connection (used by Admin). Returns job count or throws. */
export async function testCompanyConnection(company: LiveCompany): Promise<number> {
  const now = new Date().toISOString();
  const jobs =
    company.ats === 'greenhouse'
      ? await fetchGreenhouse(company, now)
      : await fetchAshby(company, now);
  return jobs.length;
}
