import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useSearchStore } from '../../store/useSearchStore';
import { parseNaturalLanguage } from '../../lib/nlparse';
import { cn } from '../ui/cn';

const EXAMPLES = [
  'Finance Manager or Financial Controller jobs in Europe requiring English or Spanish.',
  'International finance roles in Africa with relocation.',
  'Remote FP&A positions available from Spain.',
];

/**
 * Big premium hero search box. Parses natural language into a structured
 * draft, then shows the "Here's what I understood" panel for confirmation.
 */
export function NaturalSearchBox({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const draft = useSearchStore((s) => s.draft);
  const patchDraft = useSearchStore((s) => s.patchDraft);
  const run = useSearchStore((s) => s.run);
  const searching = useSearchStore((s) => s.searching);
  const understood = useSearchStore((s) => s.understood);
  const setUnderstood = useSearchStore((s) => s.setUnderstood);

  const [text, setText] = useState('');
  const [exampleIdx, setExampleIdx] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 4200);
    return () => window.clearInterval(t);
  }, []);

  const submit = () => {
    const value = text.trim();
    if (!value || searching) return;
    const parsed = parseNaturalLanguage(value);
    // keep the current draft id so "new since last search" keeps working
    patchDraft({ ...parsed.profile, id: draft.id });
    setUnderstood([...parsed.understood, ...parsed.warnings.map((w) => `NOTE: ${w}`)]);
    navigate('/search');
    run();
  };

  const rerunFromUnderstood = () => {
    navigate('/search');
    run();
  };

  return (
    <div className={cn('w-full', compact ? 'max-w-4xl' : 'mx-auto max-w-3xl')}>
      <p className={cn('font-semibold tracking-[0.18em] text-brand-700', compact ? 'text-[11px]' : 'text-[12px]')}>
        WHAT ARE YOU LOOKING FOR?
      </p>
      <div
        className={cn(
          'mt-3 rounded-2xl border border-ink-200 bg-white shadow-[0_12px_40px_rgba(8,145,178,0.08)] transition-shadow focus-within:border-brand-600/50 focus-within:shadow-[0_12px_48px_rgba(8,145,178,0.16)]',
          compact ? 'p-3' : 'p-4',
        )}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={EXAMPLES[exampleIdx]}
          rows={compact ? 2 : 3}
          className={cn(
            'w-full resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-ink-400',
            compact ? 'text-[15px]' : 'text-[17px] leading-relaxed',
          )}
          aria-label="Describe the job you are looking for"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate('/search#builder')}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
          >
            <SlidersHorizontal size={14} />
            Advanced Search
          </button>
          <Button
            variant="brand"
            size={compact ? 'md' : 'lg'}
            onClick={submit}
            disabled={searching || !text.trim()}
            className={cn(!compact && 'px-10')}
          >
            <Search size={compact ? 16 : 18} />
            SEARCH JOBS
          </Button>
        </div>
      </div>

      {/* "Here's what I understood" panel */}
      {understood && (
        <div className="fade-up mt-4 rounded-2xl border border-brand-600/25 bg-brand-50/60 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
              <Sparkles size={15} className="text-brand-600" />
              Here&rsquo;s what I understood
            </h3>
            <button
              onClick={() => setUnderstood(null)}
              aria-label="Dismiss"
              className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-white hover:text-ink-700"
            >
              <X size={16} />
            </button>
          </div>
          <ul className="mt-3 space-y-1.5">
            {understood.map((line, i) => {
              const isNote = line.startsWith('NOTE: ');
              return (
                <li key={i} className="flex items-start gap-2 text-[13.5px]">
                  {isNote ? (
                    <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning-500" />
                  ) : (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-600" />
                  )}
                  <span className={isNote ? 'text-amber-700' : 'text-ink-700'}>
                    {isNote ? line.slice(6) : line}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="brand" size="sm" onClick={rerunFromUnderstood} disabled={searching}>
              Search jobs
              <ArrowRight size={14} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/search#builder')}>
              <SlidersHorizontal size={14} />
              Fine-tune in builder
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
