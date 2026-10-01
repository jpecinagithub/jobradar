import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Info } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Dialog } from '../../components/ui/dialog';

export interface AdminFilter {
  id: string;
  name: string;
  type: 'boolean' | 'keyword' | 'range';
  searchField: string;
  matchConditions: string[];
  enabled: boolean;
}

const KEY = 'jobradar:v1:admin:filters';
const FIELDS = ['title', 'description', 'requirements', 'skills'];

function load(): AdminFilter[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AdminFilter[];
  } catch { /* ignore */ }
  return [];
}

function save(filters: AdminFilter[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(filters));
  } catch { /* ignore */ }
}

function ChipInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-800">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
              <X className="h-3 w-3 text-ink-500 hover:text-ink-900" />
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs text-ink-400">No conditions yet</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? 'Type a phrase and press Enter'}
        />
        <Button type="button" variant="outline" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

const EMPTY: Omit<AdminFilter, 'id'> = { name: '', type: 'boolean', searchField: 'description', matchConditions: [], enabled: true };

export default function FiltersPage() {
  const [filters, setFilters] = useState<AdminFilter[]>(load);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminFilter | null>(null);

  const persist = (next: AdminFilter[]) => {
    setFilters(next);
    save(next);
  };

  const openAdd = () => { setEditing({ ...EMPTY, id: `af_${Date.now().toString(36)}` }); setOpen(true); };
  const openEdit = (f: AdminFilter) => { setEditing({ ...f, matchConditions: [...f.matchConditions] }); setOpen(true); };

  const saveEditor = () => {
    if (!editing || !editing.name.trim()) return;
    const i = filters.findIndex((f) => f.id === editing.id);
    persist(i >= 0 ? filters.map((f) => (f.id === editing.id ? editing : f)) : [editing, ...filters]);
    setOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Search Filters</h2>
          <p className="text-sm text-ink-500">Define reusable filters without touching code.</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add filter</Button>
      </div>

      <Card>
        <CardContent className="flex gap-3 pt-5">
          <Info className="h-5 w-5 shrink-0 text-brand-600" />
          <p className="text-sm text-ink-600">
            Enabled filters appear automatically in <span className="font-semibold text-ink-900">Advanced Search</span>.
            Boolean filters match when any condition phrase is found; keyword filters expose a free-text
            input bound to the chosen field.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filters.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3 font-medium">Filter</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Field</th>
                    <th className="px-4 py-3 font-medium">Conditions</th>
                    <th className="px-4 py-3 font-medium">Enabled</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filters.map((f) => (
                    <tr key={f.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                      <td className="px-4 py-3 font-medium text-ink-900">{f.name}</td>
                      <td className="px-4 py-3"><Badge variant="secondary">{f.type}</Badge></td>
                      <td className="px-4 py-3 text-ink-600">{f.searchField}</td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-md flex-wrap gap-1">
                          {f.matchConditions.slice(0, 4).map((c) => (
                            <Badge key={c} variant="outline">{c}</Badge>
                          ))}
                          {f.matchConditions.length > 4 && (
                            <Badge variant="outline">+{f.matchConditions.length - 4}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Switch checked={f.enabled} onChange={(v) => persist(filters.map((x) => (x.id === f.id ? { ...x, enabled: v } : x)))} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(f)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => { if (window.confirm(`Delete filter "${f.name}"?`)) persist(filters.filter((x) => x.id !== f.id)); }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-danger-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-ink-500">
              No custom filters yet. Create one — for example <span className="font-medium text-ink-700">“Expat Package”</span> matching
              “expatriate package”, “expat package”, “housing allowance”.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing && filters.some((f) => f.id === editing.id) ? 'Edit filter' : 'Add filter'} wide>
        {editing && (
          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Filter name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Expat Package" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as AdminFilter['type'] })}>
                  <option value="boolean">Boolean</option>
                  <option value="keyword">Keyword</option>
                  <option value="range">Range</option>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Search field</Label>
                <Select value={editing.searchField} onChange={(e) => setEditing({ ...editing, searchField: e.target.value })}>
                  {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Match conditions</Label>
              <ChipInput
                values={editing.matchConditions}
                onChange={(v) => setEditing({ ...editing, matchConditions: v })}
                placeholder="e.g. expatriate package"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-3">
              <span className="text-sm font-medium text-ink-900">Enabled</span>
              <Switch checked={editing.enabled} onChange={(v) => setEditing({ ...editing, enabled: v })} />
            </div>
            <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={saveEditor}>Save filter</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
