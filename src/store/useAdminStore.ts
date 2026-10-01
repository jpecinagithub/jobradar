import { create } from 'zustand';
import type { AdminConfig, SourceDef } from '../lib/types';
import { getAdminConfig, getSourceDefs, saveAdminConfig, saveSourceDefs } from '../lib/storage';
import { SOURCE_SEEDS } from '../lib/sourceSeeds';

interface AdminState {
  config: AdminConfig;
  sources: SourceDef[];
  updateConfig: (c: Partial<AdminConfig>) => void;
  updateSource: (id: string, patch: Partial<SourceDef>) => void;
  addSource: (s: SourceDef) => void;
  removeSource: (id: string) => void;
  refresh: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  config: getAdminConfig(),
  sources: getSourceDefs(SOURCE_SEEDS),

  updateConfig: (c) => {
    const config = { ...get().config, ...c };
    saveAdminConfig(config);
    set({ config });
  },
  updateSource: (id, patch) => {
    const sources = get().sources.map((s) => (s.id === id ? { ...s, ...patch } : s));
    saveSourceDefs(sources);
    set({ sources });
  },
  addSource: (s) => {
    const sources = [s, ...get().sources];
    saveSourceDefs(sources);
    set({ sources });
  },
  removeSource: (id) => {
    const sources = get().sources.filter((s) => s.id !== id);
    saveSourceDefs(sources);
    set({ sources });
  },
  refresh: () => set({ config: getAdminConfig(), sources: getSourceDefs(SOURCE_SEEDS) }),
}));
