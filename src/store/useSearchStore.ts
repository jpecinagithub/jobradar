import { create } from 'zustand';
import type { Job, SearchProfile, SearchResult } from '../lib/types';
import { createEmptyProfile } from '../lib/types';
import {
  deleteSavedSearch, getSavedSearches, lastRunFor,
  recordSearchRun, upsertSavedSearch, getPreferences, savePreferences,
} from '../lib/storage';
import { runSearch } from '../lib/searchEngine';
import { getConnectedSources } from '../lib/connectedSources';
import {
  ensureLiveJobs,
  type LiveFetchOutcome,
} from '../lib/liveSources';
import { fetchEnabledPrivateSources } from '../lib/privateSources';

interface SearchState {
  draft: SearchProfile;
  result: SearchResult | null;
  searching: boolean;
  searchStage: string;
  savedSearches: SearchProfile[];
  diagnosticsOpen: boolean;
  understood: string[] | null;
  liveJobs: Job[];
  liveInfo: { jobs: number; companies: number; fetchedAt: string; fromCache: boolean } | null;
  liveError: string | null;
  refreshLive: (force?: boolean) => Promise<LiveFetchOutcome | null>;
  setDraft: (p: SearchProfile) => void;
  patchDraft: (p: Partial<SearchProfile>) => void;
  resetDraft: () => void;
  run: (profile?: SearchProfile) => void;
  runSaved: (id: string) => void;
  saveDraft: (name?: string) => void;
  removeSaved: (id: string) => void;
  setDiagnosticsOpen: (b: boolean) => void;
  setUnderstood: (u: string[] | null) => void;
  refreshSaved: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  draft: createEmptyProfile(),
  result: null,
  searching: false,
  searchStage: '',
  savedSearches: getSavedSearches(),
  diagnosticsOpen: false,
  understood: null,
  liveJobs: [],
  liveInfo: null,
  liveError: null,

  refreshLive: async (force = false) => {
    try {
      const outcome = await ensureLiveJobs(
        (done, total, name) => set({ searchStage: `Fetching ${name}… (${done}/${total})` }),
        force,
      );
      const companies = outcome.perCompany.filter((p) => !p.error).length;
      set({
        liveJobs: outcome.jobs,
        liveInfo: {
          jobs: outcome.jobs.length,
          companies,
          fetchedAt: outcome.fetchedAt,
          fromCache: outcome.fromCache,
        },
        liveError: outcome.jobs.length === 0
          ? 'No live jobs could be fetched. Check your connection or manage boards in Admin → Sources.'
          : null,
      });
      return outcome;
    } catch {
      set({ liveError: 'Live fetch failed unexpectedly.' });
      return null;
    }
  },

  setDraft: (p) => {
    set({ draft: p });
    savePreferences({ ...getPreferences(), lastProfile: p });
  },
  patchDraft: (p) => {
    const draft = { ...get().draft, ...p, updatedAt: new Date().toISOString() };
    set({ draft });
    savePreferences({ ...getPreferences(), lastProfile: draft });
  },
  resetDraft: () => set({ draft: createEmptyProfile(), result: null, understood: null }),

  run: (profile) => {
    const p = profile ?? get().draft;

    const finish = (pool: Job[], sources: ReturnType<typeof getConnectedSources>) => {
      const prev = p.id ? lastRunFor(p.id)?.jobIds : undefined;
      const result = runSearch(p, pool, { previousJobIds: prev, sources });

      if (p.id) {
        recordSearchRun({
          searchId: p.id,
          runAt: new Date().toISOString(),
          total: result.total,
          newCount: result.newSinceLast,
          jobIds: result.jobs.map((j) => j.job.id),
        });
      }
      set({ searching: false, searchStage: '', result });
    };

    // Live-only: fetch real boards first (cached 6h), then private API sources,
    // then run the same pipeline over the merged pool.
    set({ searching: true, searchStage: 'Connecting to live sources…', liveError: null });
    get().refreshLive(false).then(async (outcome) => {
      set({ searchStage: 'Checking private sources…' });
      let privateJobs: Job[] = [];
      try {
        const priv = await fetchEnabledPrivateSources((done, total, name) =>
          set({ searchStage: `Fetching ${name}… (${done}/${total})` }),
        );
        privateJobs = priv.flatMap((r) => r.jobs);
        const problems = priv.filter((r) => r.error || r.skipped);
        if (problems.length && !privateJobs.length && !(outcome && outcome.jobs.length)) {
          // everything failed — surface it instead of a silent empty result
          set({ liveError: problems[0].error ?? problems[0].skipped ?? 'Live fetch failed.' });
        }
      } catch {
        /* private sources are best-effort */
      }
      const pool = [...(outcome ? outcome.jobs : get().liveJobs), ...privateJobs];
      if (!pool.length) {
        set({ searching: false, searchStage: '' });
        return;
      }
      set({ searchStage: 'Scoring matches…' });
      window.setTimeout(() => finish(pool, getConnectedSources()), 500);
    });
  },

  runSaved: (id) => {
    const found = get().savedSearches.find((s) => s.id === id);
    if (!found) return;
    set({ draft: { ...found }, understood: null });
    get().run({ ...found });
  },

  saveDraft: (name) => {
    const d = get().draft;
    const p = { ...d, name: name ?? d.name, updatedAt: new Date().toISOString() };
    const next = upsertSavedSearch(p);
    set({ savedSearches: next, draft: p });
  },

  removeSaved: (id) => set({ savedSearches: deleteSavedSearch(id) }),
  setDiagnosticsOpen: (b) => set({ diagnosticsOpen: b }),
  setUnderstood: (u) => set({ understood: u }),
  refreshSaved: () => set({ savedSearches: getSavedSearches() }),
}));
