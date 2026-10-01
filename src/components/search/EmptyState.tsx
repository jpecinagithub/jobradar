import { SearchX, ArrowRight } from 'lucide-react';
import { useSearchStore } from '../../store/useSearchStore';
import type { SearchProfile } from '../../lib/types';
import { Button } from '../ui/button';

/**
 * Friendly empty state: never a bare "No results" — offer concrete
 * relax-one-criterion hints computed by the engine.
 */
export function EmptyState() {
  const result = useSearchStore((s) => s.result);
  const patchDraft = useSearchStore((s) => s.patchDraft);
  const run = useSearchStore((s) => s.run);

  if (!result) return null;

  const applyHint = (hint: { apply: Partial<SearchProfile> }) => {
    patchDraft(hint.apply);
    run();
  };

  return (
    <div className="fade-up mx-auto max-w-xl rounded-2xl border border-ink-200 bg-white p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100">
        <SearchX size={26} className="text-ink-500" />
      </div>
      <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-ink-900">
        No exact matches found.
      </h3>
      <p className="mt-1.5 text-[14px] text-ink-500">
        {result.hints.length > 0
          ? 'Try relaxing one criterion — precision first, but here is what you would unlock:'
          : 'Try broadening your criteria or removing an exclusion.'}
      </p>
      {result.hints.length > 0 && (
        <div className="mt-6 space-y-2 text-left">
          {result.hints.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50/60 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-ink-800">{h.label}</p>
                <p className="truncate text-[12.5px] text-ink-500">{h.description}</p>
              </div>
              <span className="shrink-0 text-[13px] font-bold text-brand-700">+{h.gain}</span>
              <Button variant="outline" size="sm" onClick={() => applyHint(h)} className="shrink-0">
                Apply
                <ArrowRight size={13} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
