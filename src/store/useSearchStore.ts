import { create } from 'zustand';
import type { Job, SearchProfile, SearchResult } from '../lib/types';
import { createEmptyProfile } from '../lib/types';
import {
  deleteSavedSearch, getSavedSearches, lastRunFor,
  recordSearchRun, upsertSavedSearch, getPreferences, savePreferences,
} from '../lib/storage';
import { runSearch } from '../lib/searchEngine';
import { DEMO_JOBS } from '../lib/demoJobs';
import { SOURCE_SEEDS } from '../lib/sourceSeeds';
import { getSourceDefs } from '../lib/storage';
import {
  ensureLiveJobs, getDataMode, saveDataMode,
  type DataMode, type LiveFetchOutcome,
} from '../lib/liveSources';

interface SearchState {
  draft: SearchProfile;
  result: SearchResult | null;
  searching: boolean;
  searchStage: string;
  savedSearches: SearchProfile[];
  diagnosticsOpen: boolean;
  understood: string[] | null;
  dataMode: DataMode;
  liveJobs: Job[];
  liveInfo: { jobs: number; companies: number; fetchedAt: string; fromCache: boolean } | null;
  liveError: string | null;
  setDataMode: (m: DataMode) => void;
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

const STAGES = [
  'Searching 24 sources…',
  'Normalizing results…',
  'Removing duplicates…',
  'Scoring matches…',
];

export const useSearchStore = create<SearchState>((set, get) => ({
  draft: createEmptyProfile(),
  result: null,
  searching: false,
  searchStage: '',
  savedSearches: getSavedSearches(),
  diagnosticsOpen: false,
  understood: null,
  dataMode: getDataMode(),
  liveJobs: [],
  liveInfo: null,
  liveError: null,

  setDataMode: (m) => {
    saveDataMode(m);
    set({ dataMode: m, result: null, liveError: null });
  },

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
    const live = get().dataMode === 'live';

    const finish = (pool: Job[], sources: ReturnType<typeof getSourceDefs>) => {
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

    if (live) {
      // LIVE: fetch real boards first (cached 6h), then run the same pipeline
      set({ searching: true, searchStage: 'Connecting to live sources…', liveError: null });
      get().refreshLive(false).then((outcome) => {
        const pool = outcome && outcome.jobs.length ? outcome.jobs : get().liveJobs;
        if (!pool.length) {
          set({ searching: false, searchStage: '' });
          return;
        }
        set({ searchStage: 'Scoring matches…' });
        window.setTimeout(() => finish(pool, []), 500);
      });
      return;
    }

    set({ searching: true, searchStage: STAGES[0] });
    // staged progress for the premium "engine" feel
    let i = 0;
    const tick = window.setInterval(() => {
      i++;
      if (i < STAGES.length) set({ searchStage: STAGES[i] });
    }, 650);

    window.setTimeout(() => {
      window.clearInterval(tick);
      finish(DEMO_JOBS, getSourceDefs(SOURCE_SEEDS));
    }, 2400);
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
