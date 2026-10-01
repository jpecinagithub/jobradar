import { useEffect, useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FilterChip } from '../jobs/FilterChip';
import { useSearchStore } from '../../store/useSearchStore';
import type { DatePostedFilter } from '../../lib/types';

const DATE_LABEL: Record<DatePostedFilter, string> = {
  any: 'Any time', today: 'Today', '24h': 'Last 24h', '3d': 'Last 3 days',
  '7d': 'Last 7 days', '14d': 'Last 14 days', '30d': 'Last 30 days',
};

const LEVEL_LABEL: Record<string, string> = {
  required: 'required', preferred: 'preferred', optional: 'optional',
  exclude_if_mandatory: 'excluded if mandatory',
};

export function SaveSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const draft = useSearchStore((s) => s.draft);
  const saveDraft = useSearchStore((s) => s.saveDraft);
  const [name, setName] = useState(draft.name);

  useEffect(() => {
    if (open) setName(draft.name);
  }, [open, draft.name]);

  const save = () => {
    saveDraft(name.trim() || undefined);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Save search" description="Re-run it later and get notified of new jobs only.">
      <div>
        <Label>Search name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My International Finance Search"
          className="mt-1.5"
        />
      </div>

      <div className="mt-5">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">Summary</p>
        <div className="mt-2.5 space-y-3">
          {draft.titles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12px] font-medium uppercase tracking-wide text-ink-400">Role</span>
              {draft.titles.map((t) => <FilterChip key={t} label={t} />)}
              {draft.titles.length > 1 && (
                <span className="text-[11px] font-semibold text-ink-400">ANY OF</span>
              )}
            </div>
          )}
          {draft.locations.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12px] font-medium uppercase tracking-wide text-ink-400">In</span>
              {draft.locations.map((l) => <FilterChip key={l} label={l} />)}
            </div>
          )}
          {draft.languages.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12px] font-medium uppercase tracking-wide text-ink-400">Lang</span>
              {draft.languages.map((l) => (
                <FilterChip
                  key={l.language + l.level}
                  label={`${l.language} · ${LEVEL_LABEL[l.level] ?? l.level}`}
                  tone={l.level === 'required' ? 'hard' : 'soft'}
                />
              ))}
            </div>
          )}
          {draft.experienceMin != null && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12px] font-medium uppercase tracking-wide text-ink-400">Exp</span>
              <FilterChip label={`${draft.experienceMin}+ years`} />
            </div>
          )}
          {draft.excludedTitles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12px] font-medium uppercase tracking-wide text-ink-400">Excl</span>
              {draft.excludedTitles.map((t) => <FilterChip key={t} label={t} tone="exclude" />)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12px] font-medium uppercase tracking-wide text-ink-400">Posted</span>
            <FilterChip label={DATE_LABEL[draft.datePosted]} tone="soft" />
            {draft.remote.length > 0 && <FilterChip label={draft.remote.join(' · ')} tone="soft" />}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="brand" onClick={save}>
          <BookmarkPlus size={15} />
          SAVE SEARCH
        </Button>
      </div>
    </Dialog>
  );
}
