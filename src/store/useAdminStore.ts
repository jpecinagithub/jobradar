import { create } from 'zustand';
import type { AdminConfig, SourceDef } from '../lib/types';
import { getAdminConfig, saveAdminConfig } from '../lib/storage';
import { getConnectedSources } from '../lib/connectedSources';

interface AdminState {
  config: AdminConfig;
  /** Real connected sources (live ATS boards + private API connectors). Derived, not persisted. */
  sources: SourceDef[];
  updateConfig: (c: Partial<AdminConfig>) => void;
  /** Rebuild the registry from the currently connected sources. */
  refresh: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  config: getAdminConfig(),
  sources: getConnectedSources(),

  updateConfig: (c) => {
    const config = { ...get().config, ...c };
    saveAdminConfig(config);
    set({ config });
  },
  refresh: () => set({ config: getAdminConfig(), sources: getConnectedSources() }),
}));
