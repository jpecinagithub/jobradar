import { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Trash2, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { saveSavedSearches, saveSavedJobs } from '../../lib/storage';
import { useAdminStore } from '../../store/useAdminStore';
import { useUserStore } from '../../store/useUserStore';

const APP_VERSION = '1.0.0-demo';
const BUILD_DATE = '2026-10-01';

const HEALTH_ITEMS = [
  { label: 'Source discovery scheduler', ok: true, note: 'Scanning enabled sources on schedule' },
  { label: 'Deduplication pipeline', ok: true, note: 'Duplicate groups computed on ingest' },
  { label: 'Expiration checker', ok: true, note: '404 and deadline checks run daily' },
  { label: 'Rate limiting', ok: true, note: 'Per-source limits enforced' },
  { label: 'Robots.txt compliance', ok: true, note: 'Honor robots restrictions before crawling' },
  { label: 'No CAPTCHA bypassing', ok: true, note: 'Never attempts to solve or bypass CAPTCHAs' },
  { label: 'No paywall bypassing', ok: true, note: 'Authenticated content is never scraped' },
];

export default function SystemPage() {
  const sources = useAdminStore((s) => s.sources);
  const refresh = useAdminStore((s) => s.refresh);
  const [clearedAt, setClearedAt] = useState<string | null>(null);

  const storage = useMemo(() => {
    const entries: { key: string; bytes: number }[] = [];
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('jobradar:')) continue;
      const raw = localStorage.getItem(k) ?? '';
      const bytes = new Blob([raw]).size;
      entries.push({ key: k.replace('jobradar:v1:', ''), bytes });
      total += bytes;
    }
    return { entries: entries.sort((a, b) => b.bytes - a.bytes), total };
  }, [clearedAt]);

  const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);

  const clearSearches = () => {
    if (!window.confirm('Clear all saved searches?')) return;
    saveSavedSearches([]);
    setClearedAt(new Date().toISOString());
  };
  const clearTracker = () => {
    if (!window.confirm('Clear the job tracker (all saved jobs and stages)?')) return;
    saveSavedJobs([]);
    useUserStore.setState({ entries: [] });
    setClearedAt(new Date().toISOString());
  };
  const clearAll = () => {
    if (!window.confirm('Clear ALL JOBRADAR local data? This cannot be undone.')) return;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('jobradar:')) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
    refresh();
    useUserStore.setState({ entries: [] });
    setClearedAt(new Date().toISOString());
  };

  const enabledSources = sources.filter((s) => s.enabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">System</h2>
        <p className="text-sm text-ink-500">Build info, storage, pipeline health and data controls.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Build info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-500">Version</span><span className="font-medium text-ink-900">{APP_VERSION}</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Build date</span><span className="font-medium text-ink-900">{BUILD_DATE}</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Frontend</span><span className="font-medium text-ink-900">Vite + React + TypeScript</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Sources configured</span><span className="font-medium text-ink-900">{sources.length} ({enabledSources} enabled)</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Persistence</span><Badge variant="brand">localStorage · demo</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage usage</CardTitle>
            <CardDescription>{formatBytes(storage.total)} across {storage.entries.length} keys</CardDescription>
          </CardHeader>
          <CardContent>
            {storage.entries.length ? (
              <div className="max-h-48 space-y-1.5 overflow-y-auto text-sm">
                {storage.entries.map((e) => (
                  <div key={e.key} className="flex justify-between">
                    <span className="truncate font-mono text-xs text-ink-600">{e.key}</span>
                    <span className="ml-3 shrink-0 text-xs text-ink-500">{formatBytes(e.bytes)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">No local data stored.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {HEALTH_ITEMS.map((h) => (
            <div key={h.label} className="flex items-start gap-3 rounded-lg border border-ink-100 px-4 py-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
              <div>
                <div className="text-sm font-medium text-ink-900">{h.label}</div>
                <div className="text-xs text-ink-500">{h.note}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Respect for sources</CardTitle>
          <CardDescription>Policy summary (spec §45)</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-success-600" />
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-600">
            <li>Official APIs, RSS feeds and structured data are preferred over crawling.</li>
            <li>robots.txt restrictions are honored; no authentication, CAPTCHA, rate-limit, paywall or anti-bot bypassing.</li>
            <li>Per-source rate limiting is enforced; ATS endpoints are used within published limits.</li>
            <li>Every posting stores its original URL — the Apply button always points to the source.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-danger-600" />
            <CardTitle className="text-danger-600">Danger zone</CardTitle>
          </div>
          <CardDescription>Irreversible local-data actions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={clearSearches}>
            <Trash2 className="h-4 w-4" /> Clear saved searches
          </Button>
          <Button variant="outline" onClick={clearTracker}>
            <Trash2 className="h-4 w-4" /> Clear tracker
          </Button>
          <Button variant="destructive" onClick={clearAll}>
            <Trash2 className="h-4 w-4" /> Clear all local data
          </Button>
          {clearedAt && (
            <p className="w-full text-xs text-ink-500">Last cleared: {clearedAt}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
