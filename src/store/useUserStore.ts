import { create } from 'zustand';
import type { ApplicationStage, Job, SavedJobEntry } from '../lib/types';
import { getSavedJobs, removeSavedJob, upsertSavedJob } from '../lib/storage';

interface UserState {
  entries: SavedJobEntry[];
  stageOf: (jobId: string) => ApplicationStage | undefined;
  saveJob: (job: Job, stage?: ApplicationStage) => void;
  setStage: (jobId: string, stage: ApplicationStage) => void;
  unsaveJob: (jobId: string) => void;
  setNotes: (jobId: string, notes: string) => void;
  counts: () => Record<ApplicationStage, number>;
}

export const useUserStore = create<UserState>((set, get) => ({
  entries: getSavedJobs(),

  stageOf: (jobId) => get().entries.find((e) => e.jobId === jobId)?.stage,

  saveJob: (job, stage = 'saved') => {
    const entry: SavedJobEntry = {
      jobId: job.id,
      snapshot: job,
      stage,
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set({ entries: upsertSavedJob(entry) });
  },

  setStage: (jobId, stage) => {
    const cur = get().entries.find((e) => e.jobId === jobId);
    if (!cur) return;
    set({ entries: upsertSavedJob({ ...cur, stage }) });
  },

  unsaveJob: (jobId) => set({ entries: removeSavedJob(jobId) }),

  setNotes: (jobId, notes) => {
    const cur = get().entries.find((e) => e.jobId === jobId);
    if (!cur) return;
    set({ entries: upsertSavedJob({ ...cur, notes }) });
  },

  counts: () => {
    const c = {} as Record<ApplicationStage, number>;
    for (const e of get().entries) c[e.stage] = (c[e.stage] ?? 0) + 1;
    return c;
  },
}));
