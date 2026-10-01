import { useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { useSearchStore } from '../../store/useSearchStore';
import { useAdminStore } from '../../store/useAdminStore';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import type { DatePostedFilter, RemoteType, Seniority } from '../../lib/types';
import { SENIORITY_ORDER, SENIORITY_LABEL, REMOTE_LABEL } from '../../lib/types';
import { INDUSTRIES, LANGUAGES } from '../../lib/taxonomies';
import { cn } from '../ui/cn';

const REMOTE_OPTIONS = Object.keys(REMOTE_LABEL) as RemoteType[];

const DATE_OPTIONS: { value: DatePostedFilter; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
];

function Chip({
  active, label, onToggle,
}: {
  active: boolean; label: string; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-all',
        active
          ? 'border-brand-600 bg-brand-50 text-brand-700'
          : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
      )}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-ink-100 py-4 last:border-0">
      <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-ink-500">{title}</p>
      {children}
    </div>
  );
}

/**
 * Quick filters for the results page. Every change patches the draft and
 * re-runs the search debounced (~700ms).
 */
export function ResultsSidebar() {
  const draft = useSearchStore((s) => s.draft);
  const patchDraft = useSearchStore((s) => s.patchDraft);
  const run = useSearchStore((s) => s.run);
  const resetDraft = useSearchStore((s) => s.resetDraft);
  const sources = useAdminStore((s) => s.sources);
  const timer = useRef<number | null>(null);

  const scheduleRun = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => run(), 700);
  };

  const change = (patch: Parameters<typeof patchDraft>[0]) => {
    patchDraft(patch);
    scheduleRun();
  };

  const toggleIn = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const toggleLang = (lang: string) => {
    const cur = draft.languages;
    const isRequired = cur.some((l) => l.language === lang && l.level === 'required');
    change({
      languages: isRequired
        ? cur.filter((l) => l.language !== lang)
        : [...cur.filter((l) => l.language !== lang), { language: lang, level: 'required' as const }],
    });
  };

  const toggleSource = (id: string) => {
    const enabled = sources.filter((s) => s.enabled);
    if (draft.sources.length === 0) {
      change({ sources: enabled.filter((s) => s.id !== id).map((s) => s.id) });
    } else {
      const next = toggleIn(draft.sources, id);
      change({ sources: next.length === enabled.length ? [] : next });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-[15px] font-semibold text-ink-900">Quick filters</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { resetDraft(); run(); }}
          className="gap-1.5 text-[12.5px]"
        >
          <RotateCcw size={13} />
          Clear all
        </Button>
      </div>

      <Section title="Date posted">
        <Select
          value={draft.datePosted}
          onChange={(e) => change({ datePosted: e.target.value as DatePostedFilter })}
          className="w-full"
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Section>

      <Section title={`Minimum match · ${draft.minScore}%`}>
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={draft.minScore}
          onChange={(e) => change({ minScore: +e.target.value })}
          className="w-full accent-cyan-700"
          aria-label="Minimum match score"
        />
        <div className="flex justify-between text-[11px] text-ink-400">
          <span>0%</span><span>45%</span><span>90%</span>
        </div>
      </Section>

      <Section title="Seniority">
        <div className="flex flex-wrap gap-1.5">
          {SENIORITY_ORDER.map((s: Seniority) => (
            <Chip
              key={s}
              label={SENIORITY_LABEL[s]}
              active={draft.seniority.includes(s)}
              onToggle={() => change({ seniority: toggleIn(draft.seniority, s) })}
            />
          ))}
        </div>
      </Section>

      <Section title="Work model">
        <div className="flex flex-wrap gap-1.5">
          {REMOTE_OPTIONS.map((r) => (
            <Chip
              key={r}
              label={REMOTE_LABEL[r]}
              active={draft.remote.includes(r)}
              onToggle={() => change({ remote: toggleIn(draft.remote, r) })}
            />
          ))}
        </div>
      </Section>

      <Section title="Industry">
        <div className="flex flex-wrap gap-1.5">
          {INDUSTRIES.map((i) => (
            <Chip
              key={i}
              label={i}
              active={draft.industries.includes(i)}
              onToggle={() => change({ industries: toggleIn(draft.industries, i) })}
            />
          ))}
        </div>
      </Section>

      <Section title="Language required">
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((l) => (
            <Chip
              key={l}
              label={l}
              active={draft.languages.some((x) => x.language === l && x.level === 'required')}
              onToggle={() => toggleLang(l)}
            />
          ))}
        </div>
      </Section>

      <Section title="Sources">
        <div className="flex flex-wrap gap-1.5">
          {sources.filter((s) => s.enabled).map((s) => {
            const active = draft.sources.length === 0 || draft.sources.includes(s.id);
            return (
              <Chip key={s.id} label={s.name} active={active} onToggle={() => toggleSource(s.id)} />
            );
          })}
        </div>
      </Section>
    </div>
  );
}
