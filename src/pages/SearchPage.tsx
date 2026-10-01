import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Save, RotateCcw, SlidersHorizontal, X, Radar, Activity, Sparkles } from 'lucide-react';
import { NaturalSearchBox } from '../components/search/NaturalSearchBox';
import { SearchBuilder } from '../components/search/SearchBuilder';
import { SearchProgress } from '../components/search/SearchProgress';
import { ResultsSidebar } from '../components/search/ResultsSidebar';
import { EmptyState } from '../components/search/EmptyState';
import { SaveSearchDialog } from '../components/search/SaveSearchDialog';
import { JobCard } from '../components/jobs/JobCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { useSearchStore } from '../store/useSearchStore';
import { findDuplicateGroups } from '../lib/dedup';
import { DEMO_JOBS } from '../lib/demoJobs';
import type { SortMode } from '../lib/types';
import { cn } from '../components/ui/cn';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'best', label: 'Best match' },
  { value: 'newest', label: 'Newest' },
  { value: 'salary', label: 'Salary' },
  { value: 'closing', label: 'Closing soon' },
];

export default function SearchPage() {
  const location = useLocation();
  const draft = useSearchStore((s) => s.draft);
  const patchDraft = useSearchStore((s) => s.patchDraft);
  const result = useSearchStore((s) => s.result);
  const searching = useSearchStore((s) => s.searching);
  const run = useSearchStore((s) => s.run);
  const resetDraft = useSearchStore((s) => s.resetDraft);
  const diagnosticsOpen = useSearchStore((s) => s.diagnosticsOpen);
  const setDiagnosticsOpen = useSearchStore((s) => s.setDiagnosticsOpen);

  const [saveOpen, setSaveOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // deep-link to the builder (from "Advanced Search" / "Fine-tune in builder")
  useEffect(() => {
    if (location.hash === '#builder') {
      document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  // auto-scroll to results when a run completes
  useEffect(() => {
    if (!searching && result) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searching, result]);

  // duplicate groups for the "Also found on N other sources" info
  const dupGroups = useMemo(() => findDuplicateGroups(DEMO_JOBS), []);
  const dupInfoFor = (jobId: string) => {
    const g = dupGroups.find(
      (x) => x.canonical.id === jobId || x.members.some((m) => m.job.id === jobId),
    );
    if (!g || g.members.length === 0) return undefined;
    const others = g.members.filter((m) => m.job.id !== jobId);
    if (others.length === 0) return undefined;
    return { count: others.length, sources: [...new Set(others.map((m) => m.job.source))] };
  };

  const d = result?.diagnostics;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
      {/* TOP: compact natural search */}
      <section className="pt-8">
        <NaturalSearchBox compact />
      </section>

      {/* BUILDER */}
      <section id="builder" className="mt-10 scroll-mt-24">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-brand-700" />
          <h2 className="text-[17px] font-semibold tracking-tight text-ink-900">Search builder</h2>
        </div>
        <SearchBuilder />
      </section>

      {/* STICKY ACTION BAR */}
      <div className="sticky top-16 z-30 -mx-4 mt-8 border-y border-ink-100 bg-white/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <Button variant="brand" onClick={() => run()} disabled={searching} className="px-8">
            <Search size={16} />
            SEARCH JOBS
          </Button>
          <Button variant="outline" onClick={() => setSaveOpen(true)}>
            <Save size={15} />
            <span className="hidden sm:inline">Save search</span>
          </Button>
          <Button variant="ghost" onClick={resetDraft}>
            <RotateCcw size={15} />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>

      {/* RESULTS */}
      <section id="results" ref={resultsRef} className="mt-8 scroll-mt-32">
        {searching && <SearchProgress />}

        {!searching && !result && (
          <div className="fade-up mx-auto max-w-lg rounded-2xl border border-dashed border-ink-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
              <Radar size={26} className="text-brand-700" />
            </div>
            <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-ink-900">
              Describe your ideal job above, then hit Search.
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
              Or fine-tune every criterion in the builder — hard filters eliminate,
              soft criteria boost the match score.
            </p>
          </div>
        )}

        {!searching && result && result.jobs.length === 0 && <EmptyState />}

        {!searching && result && result.jobs.length > 0 && (
          <div className="fade-up">
            {/* header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[20px] font-bold tracking-tight text-ink-900">
                  {result.total} matching job{result.total === 1 ? '' : 's'}
                </h2>
                {result.newSinceLast > 0 && (
                  <Badge variant="brand">
                    <Sparkles size={12} />
                    {result.newSinceLast} new since your last search
                  </Badge>
                )}
                {result.strongMatches > 0 && (
                  <span className="text-[13px] text-ink-500">
                    {result.strongMatches} strong match{result.strongMatches === 1 ? '' : 'es'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltersOpen(true)}
                  className="lg:hidden"
                >
                  <SlidersHorizontal size={14} />
                  Filters
                </Button>
                <Select
                  value={draft.sort}
                  onChange={(e) => {
                    patchDraft({ sort: e.target.value as SortMode });
                    run();
                  }}
                  aria-label="Sort results"
                  className="w-auto"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
                <Button
                  variant={diagnosticsOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
                  title="Search diagnostics"
                >
                  <Activity size={14} />
                  <span className="hidden sm:inline">Diagnostics</span>
                </Button>
              </div>
            </div>

            {/* diagnostics */}
            {diagnosticsOpen && d && (
              <Card className="fade-up mt-4">
                <CardContent className="p-5">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                        Filters applied
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.filtersApplied.length > 0 ? d.filtersApplied.map((f) => (
                          <Badge key={f} variant="secondary">{f}</Badge>
                        )) : <span className="text-[13px] text-ink-400">None</span>}
                      </div>
                      <p className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                        Sources searched ({d.sourcesSearched.length})
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.sourcesSearched.slice(0, 12).map((s) => (
                          <Badge key={s} variant="outline">{s}</Badge>
                        ))}
                        {d.sourcesSearched.length > 12 && (
                          <Badge variant="outline">+{d.sourcesSearched.length - 12} more</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                        Pipeline stages
                      </p>
                      <table className="mt-2 w-full text-[13px]">
                        <tbody>
                          {d.stages.map((st) => (
                            <tr key={st.name} className="border-b border-ink-100 last:border-0">
                              <td className="py-1.5 pr-2 text-ink-700">{st.name}</td>
                              <td className="py-1.5 text-right font-semibold text-ink-900">
                                {st.count.toLocaleString()}
                              </td>
                              <td className="py-1.5 pl-4 text-right text-ink-400">{st.ms}ms</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {[
                      ['Fetched', d.fetched],
                      ['Duplicates', d.duplicates],
                      ['Failed filters', d.hardFilterRejected],
                      ['Expired', d.expired],
                      ['Candidates', d.candidates],
                      ['High relevance', d.highRelevance],
                    ].map(([label, v]) => (
                      <div key={label as string} className="rounded-xl bg-ink-50 p-3 text-center">
                        <p className="text-[18px] font-bold text-ink-900">{(v as number).toLocaleString()}</p>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* body: sidebar + list */}
            <div className="mt-6 flex items-start gap-8">
              <aside className="sticky top-36 hidden w-64 shrink-0 rounded-2xl border border-ink-200 bg-white p-5 lg:block">
                <ResultsSidebar />
              </aside>
              <div className="min-w-0 flex-1 space-y-4">
                {result.jobs.map((scored, i) => (
                  <JobCard
                    key={scored.job.id}
                    scored={scored}
                    isNew={result.isNew[i]}
                    duplicateInfo={dupInfoFor(scored.job.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* MOBILE FILTERS DRAWER */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/50 fade-up"
            onClick={() => setFiltersOpen(false)}
          />
          <div className={cn(
            'absolute inset-y-0 left-0 flex w-[320px] max-w-[85vw] flex-col bg-white shadow-2xl',
          )}>
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h3 className="text-[15px] font-semibold text-ink-900">Filters</h3>
              <button
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="nice-scroll flex-1 overflow-y-auto px-5 py-4">
              <ResultsSidebar />
            </div>
            <div className="border-t border-ink-100 p-4">
              <Button variant="brand" className="w-full" onClick={() => setFiltersOpen(false)}>
                Show results
              </Button>
            </div>
          </div>
        </div>
      )}

      <SaveSearchDialog open={saveOpen} onClose={() => setSaveOpen(false)} />
    </div>
  );
}
