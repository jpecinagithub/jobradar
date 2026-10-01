import { create } from 'zustand';
import type { SearchProfile, SearchResult } from '../lib/types';
import { createEmptyProfile } from '../lib/types';
import {
  deleteSavedSearch, getSavedSearches, lastRunFor,
  recordSearchRun, upsertSavedSearch, getPreferences, savePreferences,
} from '../lib/storage';
import { runSearch } from '../lib/searchEngine';
import { DEMO_JOBS } from '../lib/demoJobs';
import { SOURCE_SEEDS } from '../lib/sourceSeeds';
import { getSourceDefs } from '../lib/storage';

interface SearchState {
  draft: SearchProfile;
  result: SearchResult | null;
  searching: boolean;
  searchStage: string;
  savedSearches: SearchProfile[];
  diagnosticsOpen: boolean;
  understood: string[] | null;
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
    set({ searching: true, searchStage: STAGES[0] });
    // staged progress for the premium "engine" feel
    let i = 0;
    const tick = window.setInterval(() => {
      i++;
      if (i < STAGES.length) set({ searchStage: STAGES[i] });
    }, 650);

    window.setTimeout(() => {
      const prev = p.id ? lastRunFor(p.id)?.jobIds : undefined;
      const sources = getSourceDefs(SOURCE_SEEDS);
      const result = runSearch(p, DEMO_JOBS, { previousJobIds: prev, sources });

      if (p.id) {
        recordSearchRun({
          searchId: p.id,
          runAt: new Date().toISOString(),
          total: result.total,
          newCount: result.newSinceLast,
          jobIds: result.jobs.map((j) => j.job.id),
        });
      }
      window.clearInterval(tick);
      set({ searching: false, searchStage: '', result });
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
