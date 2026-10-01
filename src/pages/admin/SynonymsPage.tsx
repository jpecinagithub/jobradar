import { useState } from 'react';
import { ChevronDown, X, Plus, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog } from '../../components/ui/dialog';
import { cn } from '../../components/ui/cn';
import { OCCUPATIONS, type OccupationEntry } from '../../lib/synonyms';

const KEY = 'jobradar:v1:admin:synonyms';

function load(): OccupationEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as OccupationEntry[];
  } catch { /* ignore */ }
  return JSON.parse(JSON.stringify(OCCUPATIONS)) as OccupationEntry[];
}

function save(v: OccupationEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch { /* ignore */ }
}

type ListKey = 'synonyms' | 'related' | 'narrower' | 'excluded';

const LIST_LABEL: Record<ListKey, string> = {
  synonyms: 'Synonyms',
  related: 'Related',
  narrower: 'Narrower',
  excluded: 'Excluded meanings',
};

function EditableList({ title, values, onChange, danger }: { title: string; values: string[]; onChange: (v: string[]) => void; danger?: boolean }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              danger ? 'border border-red-200 bg-danger-50 text-danger-600' : 'border border-ink-200 bg-white text-ink-800',
            )}
          >
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
              <X className="h-3 w-3 opacity-60 hover:opacity-100" />
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs text-ink-400">None</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add term…"
        />
        <Button type="button" variant="outline" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export default function SynonymsPage() {
  const [entries, setEntries] = useState<OccupationEntry[]>(load);
  const [expanded, setExpanded] = useState<string | null>('Financial Controller');
  const [editing, setEditing] = useState<OccupationEntry | null>(null);

  const persist = (next: OccupationEntry[]) => {
    setEntries(next);
    save(next);
  };

  const saveEdit = () => {
    if (!editing) return;
    persist(entries.map((e) => (e.canonical === editing.canonical ? editing : e)));
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Search Intelligence → Synonyms</h2>
        <p className="text-sm text-ink-500">The occupation dictionary the matching engine reasons with.</p>
      </div>

      <Card>
        <CardContent className="flex gap-3 pt-5">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-ink-600">
            <span className="font-semibold text-ink-900">Excluded meanings are hard rules.</span>{' '}
            “Financial Controller” matches <span className="font-medium">Finance Controller</span>,{' '}
            <span className="font-medium">Group Controller</span> or <span className="font-medium">Regional Controller</span> —
            but it must <span className="font-semibold text-danger-600">never</span> match{' '}
            <span className="font-medium">Credit Controller</span>,{' '}
            <span className="font-medium">Document Controller</span>,{' '}
            <span className="font-medium">Project Controller</span> or{' '}
            <span className="font-medium">Traffic Controller</span>.
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {entries.map((e) => {
          const isOpen = expanded === e.canonical;
          return (
            <Card key={e.canonical}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : e.canonical)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-ink-900">{e.canonical}</span>
                  <Badge variant="secondary">{e.synonyms.length} synonyms</Badge>
                  {e.excluded.length > 0 && <Badge variant="danger">{e.excluded.length} excluded</Badge>}
                </div>
                <ChevronDown className={cn('h-4 w-4 text-ink-400 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <CardContent className="border-t border-ink-100 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Synonyms</div>
                      <div className="flex flex-wrap gap-1.5">
                        {e.synonyms.map((s) => <Badge key={s} variant="brand">{s}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Related</div>
                      <div className="flex flex-wrap gap-1.5">
                        {e.related.map((s) => <Badge key={s} variant="violet">{s}</Badge>)}
                        {e.related.length === 0 && <span className="text-xs text-ink-400">None</span>}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Narrower</div>
                      <div className="flex flex-wrap gap-1.5">
                        {e.narrower.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                        {e.narrower.length === 0 && <span className="text-xs text-ink-400">None</span>}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Excluded meanings</div>
                      <div className="flex flex-wrap gap-1.5">
                        {e.excluded.map((s) => <Badge key={s} variant="danger">{s}</Badge>)}
                        {e.excluded.length === 0 && <span className="text-xs text-ink-400">None</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={() => setEditing(JSON.parse(JSON.stringify(e)) as OccupationEntry)}>
                      Edit dictionary entry
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit: ${editing.canonical}` : ''} wide>
        {editing && (
          <div className="space-y-5 px-6 py-5">
            {(Object.keys(LIST_LABEL) as ListKey[]).map((k) => (
              <EditableList
                key={k}
                title={LIST_LABEL[k]}
                values={editing[k]}
                danger={k === 'excluded'}
                onChange={(v) => setEditing({ ...editing, [k]: v })}
              />
            ))}
            <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save entry</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
