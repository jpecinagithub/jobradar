import { useMemo, useState } from 'react';
import { Plus, FlaskConical, Pencil, Trash2, ShieldCheck, RefreshCw, Building2 } from 'lucide-react';
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
import {
  ATS_LABEL, boardUrl, clearLiveCache, getLiveCacheStatus, getLiveCompanies,
  saveLiveCompanies, testCompanyConnection,
  type AtsKind, type LiveCompany,
} from '../../lib/liveSources';
import { useSearchStore } from '../../store/useSearchStore';

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

/* ---------------- Live company boards (real ATS data) ---------------- */

function LiveBoardsSection() {
  const [companies, setCompanies] = useState<LiveCompany[]>(() => getLiveCompanies());
  const [status, setStatus] = useState(() => getLiveCacheStatus());
  const [form, setForm] = useState({ name: '', ats: 'greenhouse' as AtsKind, slug: '', sector: 'Technology' });
  const [testing, setTesting] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshLive = useSearchStore((s) => s.refreshLive);

  const persist = (list: LiveCompany[]) => {
    saveLiveCompanies(list);
    setCompanies(list);
    setStatus(getLiveCacheStatus());
  };

  const addCompany = () => {
    const name = form.name.trim();
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '');
    if (!name || !slug) return;
    if (companies.some((c) => c.ats === form.ats && c.slug === slug)) {
      setTestMsg({ id: '__form', ok: false, text: 'That board is already registered.' });
      return;
    }
    persist([...companies, {
      id: `live_${form.ats}_${slug}_${Date.now().toString(36)}`,
      name, ats: form.ats, slug, sector: form.sector.trim() || 'Technology', enabled: true,
    }]);
    setForm({ name: '', ats: 'greenhouse', slug: '', sector: 'Technology' });
    setTestMsg(null);
  };

  const testBoard = async (c: LiveCompany) => {
    setTesting(c.id);
    setTestMsg(null);
    try {
      const n = await testCompanyConnection(c);
      setTestMsg({ id: c.id, ok: true, text: `OK — ${n} live job${n === 1 ? '' : 's'} found.` });
    } catch (e) {
      setTestMsg({ id: c.id, ok: false, text: `Failed: ${e instanceof Error ? e.message : 'connection error'}` });
    } finally {
      setTesting(null);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await refreshLive(true);
    setStatus(getLiveCacheStatus());
    setRefreshing(false);
  };

  const statusFor = (id: string) => status.find((s) => s.companyId === id);
  const totalJobs = status.reduce((a, s) => a + s.jobCount, 0);

  return (
    <Card className="border-emerald-200">
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-700" />
            <div>
              <h3 className="text-[15px] font-semibold text-ink-900">Live company boards</h3>
              <p className="text-[13px] text-ink-500">
                Real listings via the official public APIs of Greenhouse and Ashby. Cached for 6 hours.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">{totalJobs.toLocaleString()} jobs cached</Badge>
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh all'}
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => { clearLiveCache(); setStatus(getLiveCacheStatus()); }}
              title="Clear cached listings"
            >
              Clear cache
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">ATS</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Jobs</th>
                <th className="px-3 py-2 font-medium">Last fetch</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => {
                const st = statusFor(c.id);
                return (
                  <tr key={c.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-ink-900">{c.name}</div>
                      <a
                        href={boardUrl(c)} target="_blank" rel="noreferrer"
                        className="text-xs text-brand-700 hover:underline"
                      >
                        {c.slug}
                      </a>
                    </td>
                    <td className="px-3 py-2.5"><Badge variant="secondary">{ATS_LABEL[c.ats]}</Badge></td>
                    <td className="px-3 py-2.5">
                      {st?.error ? (
                        <Badge variant="danger" title={st.error}>Error</Badge>
                      ) : st?.fetchedAt ? (
                        <Badge variant={st.stale ? 'warning' : 'success'}>{st.stale ? 'Stale' : 'Fresh'}</Badge>
                      ) : (
                        <Badge variant="secondary">Never fetched</Badge>
                      )}
                      {testMsg?.id === c.id && (
                        <div className={`mt-1 text-xs ${testMsg.ok ? 'text-success-700' : 'text-danger-600'}`}>
                          {testMsg.text}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-ink-900">
                      {(st?.jobCount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-ink-600">
                      {st?.fetchedAt ? timeAgo(st.fetchedAt) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="sm" title="Test connection (real fetch)"
                          onClick={() => testBoard(c)} disabled={testing === c.id}
                        >
                          <FlaskConical className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" title="Delete board"
                          onClick={() => {
                            if (window.confirm(`Remove "${c.name}" from live boards?`)) {
                              persist(companies.filter((x) => x.id !== c.id));
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-danger-600" />
                        </Button>
                        <Switch
                          checked={c.enabled}
                          onChange={(v) => persist(companies.map((x) => x.id === c.id ? { ...x, enabled: v } : x))} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* add board */}
        <div className="mt-4 rounded-xl border border-dashed border-ink-300 bg-ink-50/50 p-4">
          <p className="mb-3 text-[13px] font-semibold text-ink-900">Add a company board</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label>ATS</Label>
              <Select value={form.ats} onChange={(e) => setForm({ ...form, ats: e.target.value as AtsKind })}>
                <option value="greenhouse">Greenhouse</option>
                <option value="ashby">Ashby</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Board slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="acme" />
            </div>
            <div className="space-y-1.5">
              <Label>Sector</Label>
              <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Technology" />
            </div>
            <div className="flex items-end">
              <Button onClick={addCompany} className="w-full">
                <Plus className="h-4 w-4" /> Add board
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            The slug is the board name in the company's ATS URL — e.g. <span className="font-mono">acme</span> in
            job-boards.greenhouse.io/<span className="font-mono">acme</span> or jobs.ashbyhq.com/<span className="font-mono">acme</span>.
            Use the flask button to verify it before relying on it.
          </p>
          {testMsg?.id === '__form' && (
            <p className="mt-2 text-xs text-danger-600">{testMsg.text}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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

      <LiveBoardsSection />

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
