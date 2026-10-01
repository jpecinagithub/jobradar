import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/cn';
import { useAdminStore } from '../../store/useAdminStore';
import type { ScoreBreakdown, SortMode } from '../../lib/types';

const WEIGHT_KEYS = ['title', 'location', 'skills', 'experience', 'language', 'industry', 'seniority', 'workModel'] as const;
const WEIGHT_LABEL: Record<(typeof WEIGHT_KEYS)[number], string> = {
  title: 'Job title match', location: 'Location match', skills: 'Skills match',
  experience: 'Experience match', language: 'Language match', industry: 'Industry match',
  seniority: 'Seniority match', workModel: 'Work model match',
};

const PIPELINE = [
  { name: 'Source discovery', desc: 'Enabled sources are scheduled and scanned' },
  { name: 'Ingestion', desc: 'Raw postings fetched via API, RSS or structured data' },
  { name: 'Normalization', desc: 'Titles, locations, salaries and languages canonicalized' },
  { name: 'Classification', desc: 'Function, industry, seniority and work model inferred' },
  { name: 'Deduplication', desc: 'Duplicates grouped, most original source kept' },
  { name: 'Expiration check', desc: 'Closed or 404 postings flagged and hidden' },
  { name: 'Search filtering', desc: 'Hard filters applied first — failures excluded' },
  { name: 'Semantic matching', desc: 'Synonyms, related terms, exclusions, fuzzy title match' },
  { name: 'Scoring', desc: 'Weighted relevance score 0–100, explainable' },
  { name: 'Sorting', desc: 'Best match, newest, salary or closing date' },
  { name: 'Results', desc: 'Clean list: one job, one card, original apply link' },
];

function SliderRow({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-semibold text-ink-900">{value}{unit ?? ''}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-600"
      />
    </div>
  );
}

export default function EnginePage() {
  const config = useAdminStore((s) => s.config);
  const updateConfig = useAdminStore((s) => s.updateConfig);

  const total = WEIGHT_KEYS.reduce((n, k) => n + config.weights[k], 0);
  const totalOk = total === 100;

  const setWeight = (key: (typeof WEIGHT_KEYS)[number], value: number) => {
    const weights: ScoreBreakdown = { ...config.weights, [key]: value };
    updateConfig({ weights });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Search Engine</h2>
        <p className="text-sm text-ink-500">Ranking weights and pipeline rules. Changes save automatically.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Match weights</CardTitle>
                <CardDescription>How each signal contributes to the 0–100 match score.</CardDescription>
              </div>
              <Badge variant={totalOk ? 'success' : 'danger'}>{total}/100</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {WEIGHT_KEYS.map((k) => (
              <SliderRow
                key={k}
                label={WEIGHT_LABEL[k]}
                value={config.weights[k]}
                min={0}
                max={60}
                onChange={(v) => setWeight(k, v)}
              />
            ))}
            {!totalOk && (
              <p className={cn('rounded-lg px-3 py-2 text-xs font-medium', 'bg-amber-50 text-amber-800 border border-amber-200')}>
                Weights should sum to 100 so scores stay comparable. Current total: {total}.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ranking rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <SliderRow label="Minimum match score" value={config.minScore} min={0} max={90} unit="%" onChange={(v) => updateConfig({ minScore: v })} />
              <SliderRow label="Duplicate merge threshold" value={config.duplicateThreshold} min={0} max={100} unit="%" onChange={(v) => updateConfig({ duplicateThreshold: v })} />
              <div className="space-y-1.5">
                <Label>Maximum job age (days)</Label>
                <Input
                  type="number" min={1} max={365}
                  value={config.maxJobAgeDays}
                  onChange={(e) => updateConfig({ maxJobAgeDays: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Default sorting</Label>
                <Select value={config.defaultSort} onChange={(e) => updateConfig({ defaultSort: e.target.value as SortMode })}>
                  <option value="best">Best match</option>
                  <option value="newest">Newest</option>
                  <option value="salary">Salary</option>
                  <option value="closing">Closing soon</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Search depth (max candidates evaluated)</Label>
                <Input
                  type="number" min={100} max={50000} step={100}
                  value={config.searchDepth}
                  onChange={(e) => updateConfig({ searchDepth: Math.max(100, Number(e.target.value) || 100) })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
          <CardDescription>The 11 stages every search passes through, in order.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-0 border-l-2 border-ink-200">
            {PIPELINE.map((stage, i) => (
              <li key={stage.name} className="relative pb-5 pl-8 last:pb-0">
                <span className={cn(
                  'absolute -left-[13px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                  i < 6 ? 'bg-brand-600 text-white' : 'bg-ink-900 text-white',
                )}>
                  {i + 1}
                </span>
                <div className="text-sm font-semibold text-ink-900">{stage.name.toUpperCase()}</div>
                <div className="text-sm text-ink-500">{stage.desc}</div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
