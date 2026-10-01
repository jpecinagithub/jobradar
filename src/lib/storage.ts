/* JOBRADAR — local persistence (localStorage).
   Saved searches, tracker, search runs, preferences, admin overrides. */

import type {
  AdminConfig, SavedJobEntry, SavedSearchRun, SearchProfile, SourceDef,
} from './types';
import { DEFAULT_ADMIN_CONFIG, createEmptyProfile } from './types';

const PREFIX = 'jobradar:v1:';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — ignore */
  }
}

/* ---- saved searches ---- */
export const getSavedSearches = (): SearchProfile[] => read('searches', []);
export const saveSavedSearches = (s: SearchProfile[]) => write('searches', s);

export function upsertSavedSearch(p: SearchProfile): SearchProfile[] {
  const all = getSavedSearches();
  const i = all.findIndex((x) => x.id === p.id);
  const next = i >= 0 ? all.map((x) => (x.id === p.id ? p : x)) : [p, ...all];
  saveSavedSearches(next);
  return next;
}

export function deleteSavedSearch(id: string): SearchProfile[] {
  const next = getSavedSearches().filter((x) => x.id !== id);
  saveSavedSearches(next);
  return next;
}

/* ---- tracker (saved jobs + pipeline) ---- */
export const getSavedJobs = (): SavedJobEntry[] => read('tracker', []);
export const saveSavedJobs = (s: SavedJobEntry[]) => write('tracker', s);

export function upsertSavedJob(e: SavedJobEntry): SavedJobEntry[] {
  const all = getSavedJobs();
  const i = all.findIndex((x) => x.jobId === e.jobId);
  const next = i >= 0 ? all.map((x) => (x.jobId === e.jobId ? { ...e, updatedAt: new Date().toISOString() } : x)) : [e, ...all];
  saveSavedJobs(next);
  return next;
}

export function removeSavedJob(jobId: string): SavedJobEntry[] {
  const next = getSavedJobs().filter((x) => x.jobId !== jobId);
  saveSavedJobs(next);
  return next;
}

/* ---- search runs (for "new since last search") ---- */
export const getSearchRuns = (): SavedSearchRun[] => read('runs', []);
export const saveSearchRuns = (r: SavedSearchRun[]) => write('runs', r);

export function recordSearchRun(run: SavedSearchRun): void {
  const runs = getSearchRuns().filter((r) => r.searchId !== run.searchId);
  saveSearchRuns([run, ...runs].slice(0, 60));
}

export function lastRunFor(searchId: string): SavedSearchRun | undefined {
  return getSearchRuns().find((r) => r.searchId === searchId);
}

/* ---- preferences ---- */
export interface Preferences {
  currency: string;
  demoNoticeDismissed: boolean;
  lastProfile?: SearchProfile;
}
export const getPreferences = (): Preferences =>
  read('prefs', { currency: 'EUR', demoNoticeDismissed: false });
export const savePreferences = (p: Preferences) => write('prefs', p);

/* ---- admin ---- */
export const getAdminConfig = (): AdminConfig =>
  ({ ...DEFAULT_ADMIN_CONFIG, ...read<Partial<AdminConfig>>('admin:config', {}) });
export const saveAdminConfig = (c: AdminConfig) => write('admin:config', c);

export const getSourceDefs = (seed: SourceDef[]): SourceDef[] => {
  const saved = read<SourceDef[]>('admin:sources', []);
  if (!saved.length) return seed;
  // merge: keep admin edits, add any new seed sources
  const ids = new Set(saved.map((s) => s.id));
  return [...saved, ...seed.filter((s) => !ids.has(s.id))];
};
export const saveSourceDefs = (s: SourceDef[]) => write('admin:sources', s);

/* ---- seed ---- */
export function ensureSeedProfile(): SearchProfile {
  const all = getSavedSearches();
  if (all.length) return all[0];
  const p = createEmptyProfile('My International Finance Search');
  p.titles = ['Finance Manager', 'Financial Controller', 'FP&A Manager'];
  p.locations = ['Europe', 'Africa'];
  p.languages = [
    { language: 'English', level: 'required' },
    { language: 'Spanish', level: 'preferred' },
  ];
  p.experienceMin = 5;
  p.excludedTitles = ['CFO'];
  p.datePosted = '7d';
  p.hardFilters = ['language', 'location', 'date'];
  const list = upsertSavedSearch(p);
  return list[0];
}
