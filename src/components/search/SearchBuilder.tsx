import { Plus, Trash2 } from 'lucide-react';
import { BlockCard } from './builder/BlockCard';
import { ChipInput } from './builder/ChipInput';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useSearchStore } from '../../store/useSearchStore';
import { useAdminStore } from '../../store/useAdminStore';
import type { HardFilterKey, LanguageRequirement, RemoteType, Seniority } from '../../lib/types';
import { SENIORITY_LABEL, SENIORITY_ORDER, REMOTE_LABEL, CONTRACT_LABEL } from '../../lib/types';
import { TITLE_GROUPS, FUNCTIONS, INDUSTRIES, SKILLS, LANGUAGES } from '../../lib/taxonomies';
import { REGION_NAMES, ALL_COUNTRIES } from '../../lib/geo';
import { cn } from '../ui/cn';

function ToggleChips<T extends string>({
  options, values, onChange, labels,
}: {
  options: readonly T[]; values: T[]; onChange: (v: T[]) => void; labels?: Record<string, string>;
}) {
  const toggle = (o: T) =>
    onChange(values.includes(o) ? values.filter((x) => x !== o) : [...values, o]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = values.includes(o);
        return (
          <button
            key={o}
            onClick={() => toggle(o)}
            className={cn(
              'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-all',
              active
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
            )}
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

const REMOTE_OPTIONS: RemoteType[] = [
  'on_site', 'hybrid', 'remote', 'remote_worldwide', 'remote_europe', 'remote_eu', 'remote_country', 'remote_timezone',
];

const LEVEL_LABEL: Record<LanguageRequirement['level'], string> = {
  required: 'Required', preferred: 'Preferred', optional: 'Optional', exclude_if_mandatory: 'Exclude if mandatory',
};

export function SearchBuilder() {
  const draft = useSearchStore((s) => s.draft);
  const patch = useSearchStore((s) => s.patchDraft);
  const sources = useAdminStore((s) => s.sources);

  const toggleHard = (k: HardFilterKey) => {
    const has = draft.hardFilters.includes(k);
    patch({ hardFilters: has ? draft.hardFilters.filter((x) => x !== k) : [...draft.hardFilters, k] });
  };
  const hardProps = (k: HardFilterKey) => ({
    hard: draft.hardFilters.includes(k),
    onToggleHard: () => toggleHard(k),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ROLE */}
      <BlockCard title="Role" hint="Titles, equivalences and exclusions" {...hardProps('title')}>
        <Label>Include any of these titles</Label>
        <ChipInput values={draft.titles} onChange={(v) => patch({ titles: v })} suggestions={TITLE_GROUPS} placeholder="e.g. Financial Controller" />
        <div className="mt-3">
          <Label>Exact titles only</Label>
          <ChipInput values={draft.exactTitles} onChange={(v) => patch({ exactTitles: v })} suggestions={TITLE_GROUPS} chipTone="hard" placeholder="Exact match…" />
        </div>
        <div className="mt-3">
          <Label>Exclude titles</Label>
          <ChipInput values={draft.excludedTitles} onChange={(v) => patch({ excludedTitles: v })} suggestions={TITLE_GROUPS} chipTone="exclude" placeholder="e.g. Internship" />
        </div>
      </BlockCard>

      {/* LOCATION */}
      <BlockCard title="Location" hint="Regions, countries — or remote below" {...hardProps('location')}>
        <Label>Include locations</Label>
        <ChipInput values={draft.locations} onChange={(v) => patch({ locations: v })} suggestions={[...REGION_NAMES, ...ALL_COUNTRIES]} placeholder="e.g. Europe, Germany, DACH" />
        <div className="mt-3">
          <Label>Exclude locations</Label>
          <ChipInput values={draft.excludedLocations} onChange={(v) => patch({ excludedLocations: v })} suggestions={[...REGION_NAMES, ...ALL_COUNTRIES]} chipTone="exclude" />
        </div>
      </BlockCard>

      {/* LANGUAGES */}
      <BlockCard title="Languages" hint="Required eliminates · preferred boosts score" {...hardProps('language')}>
        <div className="space-y-2">
          {draft.languages.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                value={l.language}
                onChange={(e) => patch({ languages: draft.languages.map((x, j) => j === i ? { ...x, language: e.target.value } : x) })}
                className="flex-1"
              >
                {LANGUAGES.map((x) => <option key={x} value={x}>{x}</option>)}
              </Select>
              <Select
                value={l.level}
                onChange={(e) => patch({ languages: draft.languages.map((x, j) => j === i ? { ...x, level: e.target.value as LanguageRequirement['level'] } : x) })}
                className="w-44"
              >
                {Object.entries(LEVEL_LABEL).map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
              </Select>
              <button
                onClick={() => patch({ languages: draft.languages.filter((_, j) => j !== i) })}
                className="rounded-lg p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                aria-label="Remove language"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            onClick={() => patch({ languages: [...draft.languages, { language: 'English', level: 'required' }] })}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-ink-300 px-2.5 py-1.5 text-[13px] font-medium text-ink-500 hover:border-brand-600 hover:text-brand-700"
          >
            <Plus size={13} /> Add language
          </button>
        </div>
      </BlockCard>

      {/* WORK MODEL */}
      <BlockCard title="Work model" hint="Remote flavors and restrictions" {...hardProps('remote')}>
        <ToggleChips options={REMOTE_OPTIONS} values={draft.remote} onChange={(v) => patch({ remote: v })} labels={REMOTE_LABEL} />
        {draft.remote.includes('remote_country') && (
          <div className="mt-3">
            <Label>Remote eligible from</Label>
            <Select value={draft.remoteFromCountry ?? ''} onChange={(e) => patch({ remoteFromCountry: e.target.value || undefined })}>
              <option value="">Select country…</option>
              {ALL_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        )}
      </BlockCard>

      {/* EXPERIENCE & SENIORITY */}
      <BlockCard title="Experience & seniority" hint="Inferred from title + description too" {...hardProps('seniority')}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Min years</Label>
            <Input type="number" min={0} value={draft.experienceMin ?? ''} onChange={(e) => patch({ experienceMin: e.target.value ? +e.target.value : undefined })} placeholder="5" />
          </div>
          <div>
            <Label>Max years</Label>
            <Input type="number" min={0} value={draft.experienceMax ?? ''} onChange={(e) => patch({ experienceMax: e.target.value ? +e.target.value : undefined })} placeholder="10" />
          </div>
        </div>
        <div className="mt-3">
          <Label>Seniority</Label>
          <ToggleChips options={SENIORITY_ORDER} values={draft.seniority} onChange={(v: Seniority[]) => patch({ seniority: v })} labels={SENIORITY_LABEL} />
        </div>
      </BlockCard>

      {/* KEYWORDS */}
      <BlockCard title="Keywords" hint="Must have · should have · must not have">
        <Label>Must have</Label>
        <ChipInput values={draft.mustKeywords} onChange={(v) => patch({ mustKeywords: v })} suggestions={SKILLS} chipTone="hard" placeholder="e.g. IFRS, SAP" />
        <div className="mt-3">
          <Label>Should have</Label>
          <ChipInput values={draft.shouldKeywords} onChange={(v) => patch({ shouldKeywords: v })} suggestions={SKILLS} chipTone="soft" placeholder="e.g. Spanish, international experience" />
        </div>
        <div className="mt-3">
          <Label>Must not have</Label>
          <ChipInput values={draft.mustNotKeywords} onChange={(v) => patch({ mustNotKeywords: v })} suggestions={SKILLS} chipTone="exclude" placeholder="e.g. Dutch required" />
        </div>
      </BlockCard>

      {/* FUNCTION & INDUSTRY */}
      <BlockCard title="Function & industry">
        <Label>Function</Label>
        <ToggleChips options={FUNCTIONS} values={draft.functions} onChange={(v) => patch({ functions: v })} />
        <div className="mt-3">
          <Label>Industry</Label>
          <ToggleChips options={INDUSTRIES} values={draft.industries} onChange={(v) => patch({ industries: v })} />
        </div>
        <div className="mt-3">
          <Label>Contract type</Label>
          <ToggleChips
            options={['permanent', 'fixed_term', 'temporary', 'contractor', 'consultancy', 'freelance', 'internship', 'volunteer'] as const}
            values={draft.employmentTypes}
            onChange={(v) => patch({ employmentTypes: v })}
            labels={CONTRACT_LABEL}
          />
        </div>
      </BlockCard>

      {/* SALARY */}
      <BlockCard title="Salary" hint="Converted for comparison · original always shown" {...hardProps('salary')}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Min (annual)</Label>
            <Input type="number" min={0} value={draft.salaryMin ?? ''} onChange={(e) => patch({ salaryMin: e.target.value ? +e.target.value : undefined })} placeholder="60000" />
          </div>
          <div>
            <Label>Max (annual)</Label>
            <Input type="number" min={0} value={draft.salaryMax ?? ''} onChange={(e) => patch({ salaryMax: e.target.value ? +e.target.value : undefined })} placeholder="90000" />
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={draft.salaryCurrency} onChange={(e) => patch({ salaryCurrency: e.target.value })}>
              {['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'PLN'].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>
        <div className="mt-3">
          <Switch checked={draft.salaryOnlyDisclosed} onChange={(v) => patch({ salaryOnlyDisclosed: v })} label="Only jobs with salary disclosed" />
        </div>
      </BlockCard>

      {/* COMPANIES */}
      <BlockCard title="Companies">
        <Label>Include companies</Label>
        <ChipInput values={draft.companies} onChange={(v) => patch({ companies: v })} placeholder="e.g. Siemens" />
        <div className="mt-3">
          <Label>Exclude companies</Label>
          <ChipInput values={draft.excludedCompanies} onChange={(v) => patch({ excludedCompanies: v })} chipTone="exclude" />
        </div>
      </BlockCard>

      {/* MOBILITY */}
      <BlockCard title="Mobility & visa" hint="Never invented — only what the posting states" {...hardProps('visa')}>
        <div className="space-y-3">
          <Switch checked={!!draft.visaSponsorship} onChange={(v) => patch({ visaSponsorship: v || undefined })} label="Visa sponsorship available" />
          <Switch checked={!!draft.relocation} onChange={(v) => patch({ relocation: v || undefined })} label="Relocation offered" />
        </div>
      </BlockCard>

      {/* DATE */}
      <BlockCard title="Date posted" {...hardProps('date')}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Posted</Label>
            <Select value={draft.datePosted} onChange={(e) => patch({ datePosted: e.target.value as typeof draft.datePosted })}>
              <option value="any">Any time</option>
              <option value="today">Today</option>
              <option value="24h">Last 24 hours</option>
              <option value="3d">Last 3 days</option>
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
            </Select>
          </div>
          <div className="flex items-end pb-2">
            <Switch checked={draft.onlyNewSinceLastSearch} onChange={(v) => patch({ onlyNewSinceLastSearch: v })} label="Only new since last search" />
          </div>
        </div>
      </BlockCard>

      {/* SOURCES */}
      <BlockCard title="Sources" hint="Leave empty to search everywhere" className="lg:col-span-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {sources.filter((s) => s.enabled).map((s) => {
            const active = draft.sources.length === 0 || draft.sources.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (draft.sources.length === 0) patch({ sources: sources.filter((x) => x.enabled && x.id !== s.id).map((x) => x.id) });
                  else if (draft.sources.includes(s.id)) {
                    const next = draft.sources.filter((x) => x !== s.id);
                    patch({ sources: next.length === sources.filter((x) => x.enabled).length ? [] : next });
                  } else patch({ sources: [...draft.sources, s.id] });
                }}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition-all',
                  active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-400 opacity-60',
                )}
              >
                {s.name}
              </button>
            );
          })}
        </div>
        {draft.sources.length > 0 && (
          <button onClick={() => patch({ sources: [] })} className="mt-2 text-[12.5px] font-medium text-brand-700 hover:underline">
            Search everywhere instead
          </button>
        )}
      </BlockCard>
    </div>
  );
}
