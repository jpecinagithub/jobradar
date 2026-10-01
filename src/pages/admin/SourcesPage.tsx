import { useState } from 'react';
import { Plus, FlaskConical, Trash2, ShieldCheck, RefreshCw, Building2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { timeAgo } from '../../lib/normalize';
import {
  ATS_LABEL, boardUrl, clearLiveCache, getLiveCacheStatus, getLiveCompanies,
  saveLiveCompanies, testCompanyConnection,
  type AtsKind, type LiveCompany,
} from '../../lib/liveSources';
import {
  deleteSecret, destroyVault, hasSecret, lockVault,
  setupVault, storeSecret, unlockVault, vaultStatus,
} from '../../lib/vault';
import {
  DEFAULT_FIELD_MAP, getPrivateSources, savePrivateSources, testPrivateSource,
  type PrivateAuthType, type PrivateSource, type PrivateSourceKind,
} from '../../lib/privateSources';
import { useSearchStore } from '../../store/useSearchStore';

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

/* ---------------- Private sources (user credentials, encrypted vault) ---------------- */

const KIND_LABEL: Record<PrivateSourceKind, string> = { api: 'API connector', login: 'Site login' };

interface VaultMsg { ok: boolean; text: string }

function PrivateSourcesSection() {
  const [sources, setSources] = useState<PrivateSource[]>(() => getPrivateSources());
  const [vStatus, setVStatus] = useState(() => vaultStatus());
  const [pp, setPp] = useState('');
  const [pp2, setPp2] = useState('');
  const [vMsg, setVMsg] = useState<VaultMsg | null>(null);
  const [vBusy, setVBusy] = useState(false);

  const [form, setForm] = useState({
    name: '', kind: 'api' as PrivateSourceKind, endpoint: '', loginUrl: '',
    authType: 'none' as PrivateAuthType, authHeader: 'X-Api-Key',
    sector: 'Technology', companyFallback: '', fieldMap: { ...DEFAULT_FIELD_MAP },
  });
  const [showMap, setShowMap] = useState(false);
  const [token, setToken] = useState('');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [testing, setTesting] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<{ id: string; ok: boolean; text: string; preview?: { title: string; company: string; location: string }[] } | null>(null);

  const refreshVault = () => setVStatus(vaultStatus());
  const persist = (list: PrivateSource[]) => { savePrivateSources(list); setSources(list); };

  const doSetup = async () => {
    setVMsg(null);
    if (pp !== pp2) { setVMsg({ ok: false, text: 'Passphrases do not match.' }); return; }
    setVBusy(true);
    try { await setupVault(pp); setPp(''); setPp2(''); setVMsg({ ok: true, text: 'Vault created and unlocked.' }); }
    catch (e) { setVMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed.' }); }
    finally { setVBusy(false); refreshVault(); }
  };

  const doUnlock = async () => {
    setVMsg(null); setVBusy(true);
    try { await unlockVault(pp); setPp(''); setVMsg({ ok: true, text: 'Vault unlocked.' }); }
    catch (e) { setVMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed.' }); }
    finally { setVBusy(false); refreshVault(); }
  };

  const saveSource = async () => {
    setTestMsg(null);
    const name = form.name.trim();
    if (!name) { setTestMsg({ id: '__form', ok: false, text: 'Name is required.' }); return; }
    if (form.kind === 'api' && !form.endpoint.trim()) {
      setTestMsg({ id: '__form', ok: false, text: 'Endpoint URL is required.' }); return;
    }
    if (form.kind === 'login' && !form.loginUrl.trim()) {
      setTestMsg({ id: '__form', ok: false, text: 'Login page URL is required.' }); return;
    }
    const needsToken = form.kind === 'api' && form.authType !== 'none';
    const needsLogin = form.kind === 'login';
    if ((needsToken || needsLogin) && vStatus !== 'unlocked') {
      setTestMsg({ id: '__form', ok: false, text: 'Unlock the vault first — secrets are never stored in plaintext.' }); return;
    }
    if (needsToken && !token.trim()) {
      setTestMsg({ id: '__form', ok: false, text: 'Paste the API token (it goes straight into the encrypted vault).' }); return;
    }
    if (needsLogin && (!loginUser.trim() || !loginPass)) {
      setTestMsg({ id: '__form', ok: false, text: 'Username and password are required.' }); return;
    }
    try {
      let secretRef: string | undefined;
      if (needsToken || needsLogin) {
        secretRef = `ps_${Date.now().toString(36)}`;
        await storeSecret(secretRef, needsToken ? token.trim() : JSON.stringify({ username: loginUser.trim(), password: loginPass }));
      }
      const src: PrivateSource = {
        id: `psrc_${Date.now().toString(36)}`,
        name,
        kind: form.kind,
        endpoint: form.kind === 'api' ? form.endpoint.trim() : undefined,
        loginUrl: form.kind === 'login' ? form.loginUrl.trim() : undefined,
        authType: form.authType,
        authHeader: form.authType === 'header' ? form.authHeader.trim() || 'X-Api-Key' : undefined,
        secretRef,
        fieldMap: { ...form.fieldMap },
        companyFallback: form.companyFallback.trim() || name,
        sector: form.sector.trim() || 'Technology',
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      persist([...sources, src]);
      setForm({
        name: '', kind: 'api', endpoint: '', loginUrl: '', authType: 'none',
        authHeader: 'X-Api-Key', sector: 'Technology', companyFallback: '', fieldMap: { ...DEFAULT_FIELD_MAP },
      });
      setToken(''); setLoginUser(''); setLoginPass(''); setShowMap(false);
      // auto-test API connectors right away
      if (src.kind === 'api') void runTest(src);
      else setTestMsg({ id: src.id, ok: true, text: 'Credentials stored encrypted. This site needs its own connector before it can be searched — tell me which site it is and I will build it.' });
    } catch (e) {
      setTestMsg({ id: '__form', ok: false, text: e instanceof Error ? e.message : 'Save failed.' });
    }
  };

  const runTest = async (src: PrivateSource) => {
    setTesting(src.id); setTestMsg(null);
    try {
      const r = await testPrivateSource(src);
      if (r.skipped) setTestMsg({ id: src.id, ok: true, text: r.skipped });
      else if (!r.ok) setTestMsg({ id: src.id, ok: false, text: r.error ?? 'Test failed.' });
      else setTestMsg({ id: src.id, ok: true, text: `${r.count} listing${r.count === 1 ? '' : 's'} mapped successfully.`, preview: r.preview });
    } finally { setTesting(null); }
  };

  const removeSource = (src: PrivateSource) => {
    if (!window.confirm(`Delete private source "${src.name}" and its stored secret?`)) return;
    if (src.secretRef) { try { deleteSecret(src.secretRef); } catch { /* ignore */ } }
    persist(sources.filter((s) => s.id !== src.id));
  };

  const fmKeys: { key: keyof PrivateSource['fieldMap']; label: string; hint: string }[] = [
    { key: 'items', label: 'Items array', hint: 'dot-path to the postings array, e.g. jobs or data.results' },
    { key: 'title', label: 'Title', hint: 'e.g. title' },
    { key: 'company', label: 'Company', hint: 'leave empty to use the source name' },
    { key: 'location', label: 'Location', hint: 'e.g. location or city' },
    { key: 'url', label: 'Posting URL', hint: 'required — e.g. url or applyUrl' },
    { key: 'description', label: 'Description', hint: 'plain text or HTML' },
    { key: 'postedAt', label: 'Posted date', hint: 'ISO date string' },
  ];

  return (
    <Card className="border-violet-200">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-violet-700" />
          <div>
            <h3 className="text-[15px] font-semibold text-ink-900">Private sources</h3>
            <p className="text-[13px] text-ink-500">
              Connect your own sources with credentials. Secrets are encrypted in a local vault — never stored in plaintext.
            </p>
          </div>
        </div>

        {/* vault */}
        <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={vStatus === 'unlocked' ? 'success' : vStatus === 'locked' ? 'warning' : 'secondary'}>
              {vStatus === 'unlocked' ? 'Vault unlocked' : vStatus === 'locked' ? 'Vault locked' : 'No vault yet'}
            </Badge>
            {vStatus === 'none' && (
              <>
                <Input type="password" value={pp} onChange={(e) => setPp(e.target.value)} placeholder="New vault passphrase (min 8 chars)" className="max-w-64" />
                <Input type="password" value={pp2} onChange={(e) => setPp2(e.target.value)} placeholder="Repeat passphrase" className="max-w-64" />
                <Button size="sm" onClick={doSetup} disabled={vBusy || !pp}>Create vault</Button>
              </>
            )}
            {vStatus === 'locked' && (
              <>
                <Input type="password" value={pp} onChange={(e) => setPp(e.target.value)} placeholder="Vault passphrase" className="max-w-64" onKeyDown={(e) => e.key === 'Enter' && doUnlock()} />
                <Button size="sm" onClick={doUnlock} disabled={vBusy || !pp}>Unlock</Button>
              </>
            )}
            {vStatus === 'unlocked' && (
              <>
                <Button variant="outline" size="sm" onClick={() => { lockVault(); refreshVault(); }}>Lock vault</Button>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { if (window.confirm('Delete the vault and ALL stored secrets? This cannot be undone.')) { destroyVault(); refreshVault(); setVMsg(null); } }}
                >
                  <Trash2 className="h-4 w-4 text-danger-600" />
                </Button>
              </>
            )}
          </div>
          {vMsg && <p className={`mt-2 text-xs ${vMsg.ok ? 'text-success-700' : 'text-danger-600'}`}>{vMsg.text}</p>}
          <p className="mt-2 text-xs text-ink-500">
            AES-GCM-256 encryption, key derived from your passphrase (PBKDF2, 120k rounds). The key only lives in memory —
            if you forget the passphrase, stored secrets cannot be recovered.
          </p>
        </div>

        {/* list */}
        {sources.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Secret</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-ink-900">{s.name}</div>
                      <div className="max-w-64 truncate text-xs text-ink-500">{s.endpoint ?? s.loginUrl}</div>
                      {testMsg?.id === s.id && (
                        <div className={`mt-1 text-xs ${testMsg.ok ? 'text-success-700' : 'text-danger-600'}`}>{testMsg.text}</div>
                      )}
                      {testMsg?.id === s.id && testMsg.preview && testMsg.preview.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {testMsg.preview.map((p, i) => (
                            <div key={i} className="text-xs text-ink-600">• {p.title} <span className="text-ink-400">— {p.company} · {p.location}</span></div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5"><Badge variant="secondary">{KIND_LABEL[s.kind]}</Badge></td>
                    <td className="px-3 py-2.5">
                      {s.secretRef && hasSecret(s.secretRef)
                        ? <Badge variant="success">Stored encrypted</Badge>
                        : <span className="text-xs text-ink-400">None</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {s.kind === 'api' && (
                          <Button variant="ghost" size="sm" title="Test connection (real fetch)" onClick={() => runTest(s)} disabled={testing === s.id}>
                            <FlaskConical className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" title="Delete" onClick={() => removeSource(s)}>
                          <Trash2 className="h-4 w-4 text-danger-600" />
                        </Button>
                        <Switch checked={s.enabled} onChange={(v) => persist(sources.map((x) => x.id === s.id ? { ...x, enabled: v } : x))} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* add form */}
        <div className="mt-4 rounded-xl border border-dashed border-ink-300 bg-ink-50/50 p-4">
          <p className="mb-3 text-[13px] font-semibold text-ink-900">Add a private source</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My job board" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as PrivateSourceKind })}>
                <option value="api">API connector — token / public JSON</option>
                <option value="login">Site login — username + password</option>
              </Select>
            </div>
            {form.kind === 'api' ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>JSON endpoint</Label>
                <Input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="https://api.example.com/v1/jobs" />
              </div>
            ) : (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Login page URL</Label>
                <Input value={form.loginUrl} onChange={(e) => setForm({ ...form, loginUrl: e.target.value })} placeholder="https://example.com/login" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Sector</Label>
              <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Technology" />
            </div>
            <div className="space-y-1.5">
              <Label>Company fallback</Label>
              <Input value={form.companyFallback} onChange={(e) => setForm({ ...form, companyFallback: e.target.value })} placeholder="Defaults to source name" />
            </div>
            {form.kind === 'api' && (
              <>
                <div className="space-y-1.5">
                  <Label>Authentication</Label>
                  <Select value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value as PrivateAuthType })}>
                    <option value="none">None (public JSON)</option>
                    <option value="bearer">Bearer token</option>
                    <option value="header">Custom header</option>
                  </Select>
                </div>
                {form.authType === 'header' && (
                  <div className="space-y-1.5">
                    <Label>Header name</Label>
                    <Input value={form.authHeader} onChange={(e) => setForm({ ...form, authHeader: e.target.value })} placeholder="X-Api-Key" />
                  </div>
                )}
              </>
            )}
          </div>

          {form.kind === 'api' && (
            <div className="mt-3">
              <button
                onClick={() => setShowMap(!showMap)}
                className="text-[13px] font-semibold text-brand-700 hover:underline"
              >
                {showMap ? 'Hide' : 'Show'} field mapping (JSON → job)
              </button>
              {showMap && (
                <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {fmKeys.map(({ key, label, hint }) => (
                    <div key={key} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input
                        value={form.fieldMap[key]}
                        onChange={(e) => setForm({ ...form, fieldMap: { ...form.fieldMap, [key]: e.target.value } })}
                        placeholder={hint}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* secrets — only ever go to the vault */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {form.kind === 'api' && form.authType !== 'none' && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>API token <span className="font-normal text-ink-400">— stored encrypted, never shown again</span></Label>
                <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token…" autoComplete="off" />
              </div>
            )}
            {form.kind === 'login' && (
              <>
                <div className="space-y-1.5">
                  <Label>Username <span className="font-normal text-ink-400">— stored encrypted</span></Label>
                  <Input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="user@example.com" autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label>Password <span className="font-normal text-ink-400">— stored encrypted, never shown again</span></Label>
                  <Input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                </div>
                <p className="text-xs text-ink-500 sm:col-span-2">
                  Browsers cannot log into arbitrary sites on their own — each site needs its own connector.
                  Your credentials are stored encrypted; tell me which site this is and I will build its connector.
                </p>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-ink-400">Secrets never leave this device except in the encrypted request to the source itself.</p>
            <Button onClick={saveSource}>
              <Plus className="h-4 w-4" /> {form.kind === 'api' ? 'Save & test' : 'Save credentials'}
            </Button>
          </div>
          {testMsg?.id === '__form' && (
            <p className={`mt-2 text-xs ${testMsg.ok ? 'text-success-700' : 'text-danger-600'}`}>{testMsg.text}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
export default function SourcesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Sources</h2>
        <p className="text-sm text-ink-500">
          Real connectors that feed the index. Every search runs against these live listings.
        </p>
      </div>

      <LiveBoardsSection />

      <PrivateSourcesSection />

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
    </div>
  );
}
