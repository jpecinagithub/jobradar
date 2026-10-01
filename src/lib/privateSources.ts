/* JOBRADAR — private sources.
   Lets the user connect their own sources and include them in searches:

   1. "API connector" — any JSON endpoint (official API with a personal
      token, or a public feed). The user maps the JSON fields once; the
      connector then fetches and normalizes listings on every live search.
      Secrets (tokens) live ONLY in the encrypted vault, never in the
      source record or in plaintext.

   2. "Site login" — username + password for a site that needs sign-in.
      Credentials are stored encrypted in the vault, but each site needs
      its own connector: browsers cannot perform cross-origin logins
      generically. Such sources are registered honestly as
      "connector pending" and are NOT faked into results.

   No invented data: unmapped or unparseable fields stay empty/unknown.
*/

import type { Job } from './types';
import {
  extractExperienceYears, extractLanguages, inferSeniority, normalizeTitle,
} from './normalize';
import { parseLocation } from './liveSources';
import { isVaultUnlocked, readSecret } from './vault';

export type PrivateSourceKind = 'api' | 'login';
export type PrivateAuthType = 'none' | 'bearer' | 'header';

export interface FieldMap {
  items: string;       // dot-path to the array of postings in the JSON
  title: string;
  company: string;     // may be empty → falls back to the source name
  location: string;
  url: string;
  description: string;
  postedAt: string;
}

export const DEFAULT_FIELD_MAP: FieldMap = {
  items: 'jobs',
  title: 'title',
  company: 'company',
  location: 'location',
  url: 'url',
  description: 'description',
  postedAt: 'postedAt',
};

export interface PrivateSource {
  id: string;
  name: string;
  kind: PrivateSourceKind;
  endpoint?: string;      // api kind
  loginUrl?: string;      // login kind
  authType: PrivateAuthType;
  authHeader?: string;    // when authType === 'header' (e.g. "X-Api-Key")
  secretRef?: string;     // vault reference — the ONLY place the secret lives
  fieldMap: FieldMap;
  companyFallback: string;
  sector: string;
  enabled: boolean;
  createdAt: string;
}

const STORE_KEY = 'jobradar:private-sources:v1';
const FETCH_TIMEOUT_MS = 25_000;
const MAX_DESC_CHARS = 3500;

export function getPrivateSources(): PrivateSource[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePrivateSources(list: PrivateSource[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch { /* quota */ }
}

/** Resolve a dot-path like "data.jobs.0.title" inside a JSON value. */
export function getPath(obj: unknown, path: string): unknown {
  if (!path.trim()) return undefined;
  let cur: unknown = obj;
  for (const seg of path.split('.')) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      const i = Number(seg);
      if (!Number.isInteger(i)) return undefined;
      cur = cur[i];
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

function asString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapPrivateItem(item: unknown, src: PrivateSource, now: string, idx: number): Job | null {
  const fm = src.fieldMap;
  const title = asString(getPath(item, fm.title)).trim();
  const url = asString(getPath(item, fm.url)).trim();
  if (!title || !url) return null; // without title+url it is not a usable listing
  const company = asString(getPath(item, fm.company)).trim() || src.companyFallback || src.name;
  const loc = parseLocation(asString(getPath(item, fm.location)));
  const rawDesc = asString(getPath(item, fm.description));
  const description = (/<[a-z][\s\S]*>/i.test(rawDesc) ? stripHtml(rawDesc) : rawDesc)
    .slice(0, MAX_DESC_CHARS) || `${title} at ${company}.`;
  const postedRaw = asString(getPath(item, fm.postedAt)).trim();
  const postedAt = postedRaw && !Number.isNaN(Date.parse(postedRaw))
    ? new Date(postedRaw).toISOString()
    : now;
  const langs = extractLanguages(`${title} ${description}`);
  const exp = extractExperienceYears(`${title} ${description}`);

  return {
    id: `private_${src.id}_${idx}`,
    title,
    normalizedTitle: normalizeTitle(title),
    company,
    city: loc.city,
    country: loc.country,
    remoteType: loc.remoteType,
    eligibleRemoteCountries: loc.countries,
    remoteRestrictionNote: loc.note,
    employmentType: 'permanent',
    seniority: inferSeniority(title, description),
    salaryConfidence: 'UNKNOWN',
    description,
    responsibilities: [],
    requirements: [],
    skills: [],
    languagesRequired: langs.required,
    languagesPreferred: langs.preferred,
    languageConfidence: langs.required.length || langs.preferred.length ? 'INFERRED' : 'UNKNOWN',
    experienceMin: exp.min,
    experienceMax: exp.max,
    industry: src.sector ? [src.sector] : [],
    function: [],
    visaSponsorship: 'not_mentioned',
    relocation: false,
    relocationConfidence: 'UNKNOWN',
    expatriatePackage: false,
    postedAt,
    discoveredAt: now,
    lastVerifiedAt: now,
    source: src.name,
    sourceType: 'ATS',
    sourceUrl: src.endpoint ?? src.loginUrl ?? '',
    applyUrl: url,
    ats: 'custom',
    status: 'ACTIVE',
    qualityScore: 80,
  };
}

async function fetchPrivateApi(src: PrivateSource): Promise<Job[]> {
  if (!src.endpoint) throw new Error('No endpoint configured.');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (src.authType !== 'none') {
    if (!isVaultUnlocked()) throw new Error('Vault is locked — unlock it in Admin → Sources.');
    const secret = src.secretRef ? await readSecret(src.secretRef) : null;
    if (!secret) throw new Error('No secret stored for this source.');
    if (src.authType === 'bearer') headers.Authorization = `Bearer ${secret}`;
    else headers[src.authHeader || 'X-Api-Key'] = secret;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(src.endpoint, { signal: ctrl.signal, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    const items = getPath(data, src.fieldMap.items);
    if (!Array.isArray(items)) {
      throw new Error(`No array found at "${src.fieldMap.items}". Adjust the field mapping.`);
    }
    const now = new Date().toISOString();
    return items
      .map((it, i) => mapPrivateItem(it, src, now, i))
      .filter((j): j is Job => j !== null);
  } finally {
    clearTimeout(t);
  }
}

export interface PrivateFetchResult {
  source: PrivateSource;
  jobs: Job[];
  error?: string;
  skipped?: string; // honest reason when not even attempted
}

export async function fetchPrivateSource(src: PrivateSource): Promise<PrivateFetchResult> {
  if (src.kind === 'login') {
    return {
      source: src,
      jobs: [],
      skipped: 'Site-login connectors are per-site. Credentials are stored encrypted; tell me which site and I will build its connector.',
    };
  }
  try {
    return { source: src, jobs: await fetchPrivateApi(src) };
  } catch (err) {
    return { source: src, jobs: [], error: err instanceof Error ? err.message : 'Fetch failed' };
  }
}

/** Fetch every enabled private API source. Used by live search. */
export async function fetchEnabledPrivateSources(
  onProgress?: (done: number, total: number, name: string) => void,
): Promise<PrivateFetchResult[]> {
  const enabled = getPrivateSources().filter((s) => s.enabled);
  let done = 0;
  return Promise.all(
    enabled.map(async (s) => {
      const r = await fetchPrivateSource(s);
      done++;
      onProgress?.(done, enabled.length, s.name);
      return r;
    }),
  );
}

export interface PrivateTestOutcome {
  ok: boolean;
  count: number;
  preview: { title: string; company: string; location: string; url: string }[];
  error?: string;
  skipped?: string;
}

/** Test button: real fetch + real mapping, preview of the first 3. */
export async function testPrivateSource(src: PrivateSource): Promise<PrivateTestOutcome> {
  const r = await fetchPrivateSource(src);
  if (r.skipped) return { ok: true, count: 0, preview: [], skipped: r.skipped };
  if (r.error) return { ok: false, count: 0, preview: [], error: r.error };
  return {
    ok: true,
    count: r.jobs.length,
    preview: r.jobs.slice(0, 3).map((j) => ({
      title: j.title,
      company: j.company,
      location: [j.city, j.country].filter(Boolean).join(', ') || j.remoteRestrictionNote || '—',
      url: j.applyUrl,
    })),
  };
}
