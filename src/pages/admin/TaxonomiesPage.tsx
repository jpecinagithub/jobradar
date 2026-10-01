import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs } from '../../components/ui/tabs';
import {
  TITLE_GROUPS, FUNCTIONS, INDUSTRIES, SKILLS, LANGUAGES,
  CONTRACT_TYPES, WORK_MODELS,
} from '../../lib/taxonomies';
import { REGION_NAMES } from '../../lib/geo';
import { SENIORITY_LABEL, CONTRACT_LABEL, REMOTE_LABEL } from '../../lib/types';

const KEY = 'jobradar:v1:admin:taxonomies';

type TaxonomyKey =
  | 'jobTitles' | 'functions' | 'industries' | 'seniority' | 'skills'
  | 'languages' | 'regions' | 'contractTypes' | 'workModels';

const TABS: { key: TaxonomyKey; label: string }[] = [
  { key: 'jobTitles', label: 'Job titles' },
  { key: 'functions', label: 'Functions' },
  { key: 'industries', label: 'Industries' },
  { key: 'seniority', label: 'Seniority' },
  { key: 'skills', label: 'Skills' },
  { key: 'languages', label: 'Languages' },
  { key: 'regions', label: 'Regions' },
  { key: 'contractTypes', label: 'Contract types' },
  { key: 'workModels', label: 'Work models' },
];

function seed(): Record<TaxonomyKey, string[]> {
  return {
    jobTitles: [...TITLE_GROUPS],
    functions: [...FUNCTIONS],
    industries: [...INDUSTRIES],
    seniority: Object.values(SENIORITY_LABEL),
    skills: [...SKILLS],
    languages: [...LANGUAGES],
    regions: [...REGION_NAMES],
    contractTypes: [...CONTRACT_TYPES],
    workModels: [...WORK_MODELS],
  };
}

function load(): Record<TaxonomyKey, string[]> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...seed(), ...(JSON.parse(raw) as Partial<Record<TaxonomyKey, string[]>>) };
  } catch { /* ignore */ }
  return seed();
}

function save(v: Record<TaxonomyKey, string[]>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch { /* ignore */ }
}

function labelFor(key: TaxonomyKey, value: string): string {
  if (key === 'contractTypes') return CONTRACT_LABEL[value as keyof typeof CONTRACT_LABEL] ?? value;
  if (key === 'workModels') return REMOTE_LABEL[value as keyof typeof REMOTE_LABEL] ?? value;
  return value;
}

export default function TaxonomiesPage() {
  const [data, setData] = useState<Record<TaxonomyKey, string[]>>(load);
  const [active, setActive] = useState<TaxonomyKey>('jobTitles');
  const [draft, setDraft] = useState('');

  const persist = (next: Record<TaxonomyKey, string[]>) => {
    setData(next);
    save(next);
  };

  const add = () => {
    const v = draft.trim();
    if (!v || data[active].includes(v)) return;
    persist({ ...data, [active]: [...data[active], v] });
    setDraft('');
  };

  const remove = (v: string) => {
    persist({ ...data, [active]: data[active].filter((x) => x !== v) });
  };

  const reset = () => {
    if (window.confirm('Reset all taxonomies to seed values?')) persist(seed());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Taxonomies</h2>
          <p className="text-sm text-ink-500">Controlled vocabularies used by the search engine.</p>
        </div>
        <Button variant="outline" onClick={reset}>Reset to seed</Button>
      </div>

      <Tabs
        tabs={TABS.map((t) => ({ id: t.key, label: t.label }))}
        active={active}
        onChange={(id) => { setActive(id as TaxonomyKey); setDraft(''); }}
      />

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              placeholder={`Add to ${TABS.find((t) => t.key === active)?.label}…`}
            />
            <Button onClick={add}><Plus className="h-4 w-4" /> Add</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data[active].map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-3 py-1 text-sm text-ink-800"
              >
                {labelFor(active, v)}
                <button type="button" onClick={() => remove(v)} aria-label={`Remove ${v}`}>
                  <X className="h-3.5 w-3.5 text-ink-400 hover:text-danger-600" />
                </button>
              </span>
            ))}
            {data[active].length === 0 && (
              <p className="text-sm text-ink-500">Empty — add the first entry above.</p>
            )}
          </div>
          <p className="mt-4 text-xs text-ink-400">{data[active].length} entries in this taxonomy.</p>
        </CardContent>
      </Card>
    </div>
  );
}
