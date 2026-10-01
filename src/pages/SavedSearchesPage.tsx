import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Clock, History, Pencil, Play, Search, SearchX, Sparkles, Trash2 } from 'lucide-react';
import type { DatePostedFilter, SavedSearchRun, SearchProfile } from '../lib/types';
import { REMOTE_LABEL, SENIORITY_LABEL } from '../lib/types';
import { ensureSeedProfile, lastRunFor, upsertSavedSearch } from '../lib/storage';
import { timeAgo } from '../lib/normalize';
import { useSearchStore } from '../store/useSearchStore';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog } from '../components/ui/dialog';
import { Input } from '../components/ui/input';

/* ---------------- visual summary helpers ---------------- */

function Chip({ children, tone = 'secondary' }: { children: React.ReactNode; tone?: 'secondary' | 'outline' | 'brand' | 'danger' }) {
  const variant = tone === 'danger' ? 'danger' : tone === 'outline' ? 'outline' : tone === 'brand' ? 'brand' : 'secondary';
  return <Badge variant={variant}>{children}</Badge>;
}

function OrChips({ items }: { items: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {items.map((t, i) => (
        <span key={`${t}-${i}`} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">or</span>}
          <Chip>{t}</Chip>
        </span>
      ))}
    </span>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      <span className="inline-flex flex-1 flex-wrap items-center gap-1.5">{children}</span>
    </div>
  );
}

const DATE_LABEL: Record<DatePostedFilter, string | null> = {
  any: null,
  today: 'Posted today',
  '24h': 'Posted < 24 hours',
  '3d': 'Posted < 3 days',
  '7d': 'Posted < 7 days',
  '14d': 'Posted < 14 days',
  '30d': 'Posted < 30 days',
};

function ProfileSummary({ profile }: { profile: SearchProfile }) {
  const langTone = (l: SearchProfile['languages'][number]) =>
    l.level === 'required' ? 'brand'
    : l.level === 'preferred' ? 'secondary'
    : l.level === 'exclude_if_mandatory' ? 'danger'
    : 'outline';
  const langText = (l: SearchProfile['languages'][number]) => {
    const suffix = l.level === 'required' ? 'required'
      : l.level === 'preferred' ? 'preferred'
      : l.level === 'optional' ? 'optional'
      : 'exclude if mandatory';
    return `${l.language} · ${suffix}`;
  };

  return (
    <div className="space-y-2.5">
      {profile.titles.length > 0 && (
        <Group label="Role">
          <OrChips items={profile.titles} />
          {profile.exactTitles.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">exact</span>
              <OrChips items={profile.exactTitles} />
            </span>
          )}
        </Group>
      )}
      {profile.functions.length > 0 && (
        <Group label="Function"><OrChips items={profile.functions} /></Group>
      )}
      {profile.locations.length > 0 && (
        <Group label="In">
          <OrChips items={profile.locations} />
          {profile.excludedLocations.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">not</span>
              <OrChips items={profile.excludedLocations} />
            </span>
          )}
        </Group>
      )}
      {profile.languages.length > 0 && (
        <Group label="Requiring">
          {profile.languages.map((l) => <Chip key={l.language} tone={langTone(l)}>{langText(l)}</Chip>)}
        </Group>
      )}
      {profile.remote.length > 0 && (
        <Group label="Work model"><OrChips items={profile.remote.map((r) => REMOTE_LABEL[r])} /></Group>
      )}
      {profile.seniority.length > 0 && (
        <Group label="Seniority"><OrChips items={profile.seniority.map((s) => SENIORITY_LABEL[s])} /></Group>
      )}
      {(profile.experienceMin != null || profile.experienceMax != null) && (
        <Group label="Experience">
          <Chip>
            {profile.experienceMin != null && profile.experienceMax != null
              ? `${profile.experienceMin}–${profile.experienceMax} years`
              : profile.experienceMin != null
                ? `${profile.experienceMin}+ years`
                : `Up to ${profile.experienceMax} years`}
          </Chip>
        </Group>
      )}
      {profile.mustKeywords.length > 0 && (
        <Group label="Must have"><OrChips items={profile.mustKeywords} /></Group>
      )}
      {profile.shouldKeywords.length > 0 && (
        <Group label="Nice to have"><OrChips items={profile.shouldKeywords} /></Group>
      )}
      {profile.companies.length > 0 && (
        <Group label="Companies"><OrChips items={profile.companies} /></Group>
      )}
      {(profile.excludedTitles.length > 0 || profile.excludedCompanies.length > 0 || profile.mustNotKeywords.length > 0) && (
        <Group label="Excluding">
          {profile.excludedTitles.map((t) => <Chip key={t} tone="danger">{t}</Chip>)}
          {profile.excludedCompanies.map((t) => <Chip key={t} tone="danger">{t}</Chip>)}
          {profile.mustNotKeywords.map((t) => <Chip key={t} tone="danger">{t}</Chip>)}
        </Group>
      )}
      <Group label="Posted">
        {DATE_LABEL[profile.datePosted] ? <Chip tone="outline">{DATE_LABEL[profile.datePosted]}</Chip> : <span className="text-[13px] text-ink-400">Any time</span>}
        {profile.onlyNewSinceLastSearch && <Chip tone="brand"><Sparkles size={12} /> Only new since last search</Chip>}
      </Group>
    </div>
  );
}

/* ---------------- rename dialog ---------------- */

function RenameDialog({ profile, onClose }: { profile: SearchProfile | null; onClose: () => void }) {
  const [name, setName] = useState(profile?.name ?? '');
  const refreshSaved = useSearchStore((s) => s.refreshSaved);

  useEffect(() => setName(profile?.name ?? ''), [profile]);

  const save = () => {
    if (!profile || !name.trim()) return;
    upsertSavedSearch({ ...profile, name: name.trim(), updatedAt: new Date().toISOString() });
    refreshSaved();
    onClose();
  };

  return (
    <Dialog open={!!profile} onClose={onClose} title="Rename search">
      <div className="space-y-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Search name"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={save} disabled={!name.trim()}>Save</Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ---------------- card ---------------- */

function SearchProfileCard({ profile, onRename }: { profile: SearchProfile; onRename: () => void }) {
  const navigate = useNavigate();
  const runSaved = useSearchStore((s) => s.runSaved);
  const removeSaved = useSearchStore((s) => s.removeSaved);
  const [run] = useState<SavedSearchRun | undefined>(() => lastRunFor(profile.id));

  const handleDelete = () => {
    if (window.confirm(`Delete saved search "${profile.name}"?`)) removeSaved(profile.id);
  };

  const handleRun = () => {
    runSaved(profile.id);
    navigate('/search');
  };

  return (
    <Card className="flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(8,145,178,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-semibold tracking-tight text-ink-900">{profile.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-500">
            <Clock size={13} />
            {run ? (
              <span>Last checked: {timeAgo(run.runAt)}</span>
            ) : (
              <span>Not run yet</span>
            )}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onRename} aria-label="Rename search" className="shrink-0">
          <Pencil size={16} />
        </Button>
      </div>

      <div className="mt-4 flex-1">
        <ProfileSummary profile={profile} />
      </div>

      {run && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3.5 text-[12.5px]">
          <Badge variant="outline">Total: {run.total}</Badge>
          {run.newCount > 0
            ? <Badge variant="brand"><Sparkles size={12} /> New: {run.newCount}</Badge>
            : <Badge variant="secondary">No new jobs</Badge>}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button variant="brand" size="sm" className="flex-1" onClick={handleRun}>
          <Play size={14} /> Run again
        </Button>
        <Button variant="outline" size="sm" onClick={onRename}>
          <Pencil size={14} /> Rename
        </Button>
        <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete search" className="text-danger-600 hover:bg-danger-50">
          <Trash2 size={16} />
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- page ---------------- */

export default function SavedSearchesPage() {
  const navigate = useNavigate();
  const savedSearches = useSearchStore((s) => s.savedSearches);
  const refreshSaved = useSearchStore((s) => s.refreshSaved);
  const [renaming, setRenaming] = useState<SearchProfile | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (useSearchStore.getState().savedSearches.length === 0) {
      ensureSeedProfile();
      refreshSaved();
    }
  }, [refreshSaved]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-[28px]">Saved Searches</h1>
          <p className="mt-1 text-[14px] text-ink-500">
            Re-run your search profiles and spot new jobs since your last check.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/search')}>
          <Search size={15} /> New search
        </Button>
      </div>

      {savedSearches.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-ink-300 bg-white px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <SearchX size={26} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink-900">No saved searches yet</h2>
          <p className="mt-1 max-w-sm text-[14px] text-ink-500">
            Build a search with the visual search builder, save it, and get notified about new matches.
          </p>
          <Button variant="brand" className="mt-5" onClick={() => navigate('/search')}>
            <Search size={15} /> Create a search
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center gap-2 text-[13px] text-ink-500">
            <History size={14} />
            <span>{savedSearches.length} saved {savedSearches.length === 1 ? 'search' : 'searches'}</span>
            <span className="inline-flex items-center gap-1">
              <BellRing size={14} />
              New jobs are flagged on every re-run
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {savedSearches.map((p) => (
              <SearchProfileCard key={p.id} profile={p} onRename={() => setRenaming(p)} />
            ))}
          </div>
        </>
      )}

      <RenameDialog profile={renaming} onClose={() => setRenaming(null)} />
    </div>
  );
}
