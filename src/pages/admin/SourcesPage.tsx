import { useMemo, useState } from 'react';
import { Plus, FlaskConical, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Dialog } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { timeAgo } from '../../lib/normalize';
import { DEMO_JOBS } from '../../lib/demoJobs';
import { SOURCE_TYPE_LABEL, type SourceDef, type SourceMethod, type SourceType } from '../../lib/types';
import { useAdminStore } from '../../store/useAdminStore';

const METHODS: SourceMethod[] = ['API', 'RSS', 'STRUCTURED_DATA', 'CAREER_PAGE', 'CUSTOM_CONNECTOR', 'MANUAL', 'APPROVED_CRAWLER'];
const TYPES: SourceType[] = ['PRIMARY', 'ATS', 'SPECIALIST_BOARD', 'OFFICIAL', 'AGGREGATOR', 'SEARCH_ENGINE'];

const STATUS_VARIANT: Record<SourceDef['status'], 'success' | 'warning' | 'danger' | 'brand'> = {
  ACTIVE: 'success', PAUSED: 'warning', ERROR: 'danger', DEMO: 'brand',
};

function stableSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

interface TestResult {
  ok: boolean;
  detected: number;
  valid: number;
  errors: number;
  preview: { id: string; title: string; company: string; location: string }[];
}

function simulateTest(source: SourceDef): TestResult {
  const seed = stableSeed(source.id);
  const detected = Math.max(5, (source.jobsIndexed % 1400) + (seed % 97));
  const errors = seed % 11 === 0 ? 2 : seed % 7;
  const valid = detected - errors;
  const pool = DEMO_JOBS.filter((j) => j.source === source.name);
  const src = pool.length ? pool : DEMO_JOBS;
  const preview = src.slice(0, 5).map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company,
    location: [j.city, j.country].filter(Boolean).join(', ') || 'Remote',
  }));
  return { ok: errors < 10, detected, valid, errors, preview };
}

const EMPTY_EDITOR: Omit<SourceDef, 'id' | 'lastScan' | 'jobsIndexed' | 'errors' | 'status'> = {
  name: '', domain: '', type: 'ATS', country: '', sector: '',
  method: 'API', endpoint: '', frequency: 'daily', priority: 5,
  enabled: true, notes: '',
};

export default function SourcesPage() {
  const sources = useAdminStore((s) => s.sources);
  const updateSource = useAdminStore((s) => s.updateSource);
  const addSource = useAdminStore((s) => s.addSource);
  const removeSource = useAdminStore((s) => s.removeSource);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SourceDef> | null>(null);
  const [testTarget, setTestTarget] = useState<SourceDef | null>(null);

  const testResult = useMemo(() => (testTarget ? simulateTest(testTarget) : null), [testTarget]);

  const openAdd = () => {
    setEditing({ ...EMPTY_EDITOR });
    setEditorOpen(true);
  };
  const openEdit = (s: SourceDef) => {
    setEditing({ ...s });
    setEditorOpen(true);
  };
  const saveEditor = () => {
    if (!editing || !editing.name?.trim() || !editing.domain?.trim()) return;
    if (editing.id) {
      const { id, ...patch } = editing;
      updateSource(id, patch as Partial<SourceDef>);
    } else {
      const now = new Date().toISOString();
      addSource({
        id: `src_${Date.now().toString(36)}`,
        name: editing.name.trim(),
        domain: editing.domain.trim(),
        type: editing.type ?? 'ATS',
        country: editing.country,
        sector: editing.sector,
        method: editing.method ?? 'API',
        endpoint: editing.endpoint,
        frequency: editing.frequency ?? 'daily',
        priority: editing.priority ?? 5,
        enabled: editing.enabled ?? true,
        status: 'ACTIVE',
        lastScan: now,
        jobsIndexed: 0,
        errors: 0,
        notes: editing.notes,
      });
    }
    setEditorOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Sources</h2>
          <p className="text-sm text-ink-500">Connectors that feed the index. Priority 1 = most original.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add source
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Last scan</th>
                  <th className="px-4 py-3 font-medium text-right">Jobs</th>
                  <th className="px-4 py-3 font-medium text-right">Errors</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-900">{s.name}</div>
                      <div className="text-xs text-ink-500">{s.domain}</div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="secondary">{SOURCE_TYPE_LABEL[s.type]}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge></td>
                    <td className="px-4 py-3 text-ink-600">{s.method.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-ink-600">{s.lastScan ? timeAgo(s.lastScan) : 'Never'}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink-900">{s.jobsIndexed.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={s.errors > 0 ? 'font-semibold text-danger-600' : 'text-ink-400'}>{s.errors}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setTestTarget(s)} title="Test source">
                          <FlaskConical className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { if (window.confirm(`Delete source "${s.name}"?`)) removeSource(s.id); }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-danger-600" />
                        </Button>
                        <Switch checked={s.enabled} onChange={(v) => updateSource(s.id, { enabled: v })} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Respect note */}
      <Card>
        <CardContent className="flex gap-3 pt-5">
          <ShieldCheck className="h-5 w-5 shrink-0 text-success-600" />
          <div className="text-sm text-ink-600">
            <span className="font-semibold text-ink-900">Respect for sources. </span>
            JOBRADAR never bypasses authentication, CAPTCHAs, paywalls or anti-bot protections.
            Connectors prefer official APIs, RSS feeds and structured data, honor robots.txt,
            and apply per-source rate limiting before any crawl.
          </div>
        </CardContent>
      </Card>

      {/* Editor dialog */}
      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} title={editing?.id ? 'Edit source' : 'Add source'} wide>
        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editing?.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Greenhouse" />
            </div>
            <div className="space-y-1.5">
              <Label>Domain</Label>
              <Input value={editing?.domain ?? ''} onChange={(e) => setEditing({ ...editing, domain: e.target.value })} placeholder="boards.greenhouse.io" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editing?.type ?? 'ATS'} onChange={(e) => setEditing({ ...editing, type: e.target.value as SourceType })}>
                {TYPES.map((t) => <option key={t} value={t}>{SOURCE_TYPE_LABEL[t]}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Integration method</Label>
              <Select value={editing?.method ?? 'API'} onChange={(e) => setEditing({ ...editing, method: e.target.value as SourceMethod })}>
                {METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={editing?.country ?? ''} onChange={(e) => setEditing({ ...editing, country: e.target.value })} placeholder="Global" />
            </div>
            <div className="space-y-1.5">
              <Label>Sector</Label>
              <Input value={editing?.sector ?? ''} onChange={(e) => setEditing({ ...editing, sector: e.target.value })} placeholder="Technology" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>API endpoint</Label>
              <Input value={editing?.endpoint ?? ''} onChange={(e) => setEditing({ ...editing, endpoint: e.target.value })} placeholder="https://boards-api.greenhouse.io/v1/boards/…" />
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Input value={editing?.frequency ?? ''} onChange={(e) => setEditing({ ...editing, frequency: e.target.value })} placeholder="hourly / daily" />
            </div>
            <div className="space-y-1.5">
              <Label>Priority (1 = most original)</Label>
              <Input type="number" min={1} max={10} value={editing?.priority ?? 5} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={editing?.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Connector notes, contact, quirks…" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-3 sm:col-span-2">
              <span className="text-sm font-medium text-ink-900">Enabled</span>
              <Switch checked={editing?.enabled ?? true} onChange={(v) => setEditing({ ...editing, enabled: v })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={saveEditor}>Save source</Button>
          </div>
        </div>
      </Dialog>

      {/* Test panel */}
      <Dialog open={!!testTarget} onClose={() => setTestTarget(null)} title={testTarget ? `Test: ${testTarget.name}` : ''} wide>
        {testTarget && testResult && (
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center gap-2">
              <Badge variant={testResult.ok ? 'success' : 'warning'}>
                {testResult.ok ? 'Connection successful' : 'Connection unstable'}
              </Badge>
              <span className="text-sm text-ink-500">{testResult.detected} jobs detected</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-ink-900">{testResult.detected}</div><div className="text-xs text-ink-500">Detected</div></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-success-600">{testResult.valid}</div><div className="text-xs text-ink-500">Valid</div></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-danger-600">{testResult.errors}</div><div className="text-xs text-ink-500">Errors</div></CardContent></Card>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-ink-900">Preview (5 jobs)</h4>
              <div className="space-y-2">
                {testResult.preview.map((p) => (
                  <div key={p.id} className="rounded-lg border border-ink-200 px-3 py-2 text-sm">
                    <div className="font-medium text-ink-900">{p.title}</div>
                    <div className="text-xs text-ink-500">{p.company} · {p.location}</div>
                  </div>
                ))}
                {testResult.preview.length === 0 && (
                  <p className="text-sm text-ink-500">No jobs in the demo index for this source yet.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setTestTarget(null)}>Close</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
