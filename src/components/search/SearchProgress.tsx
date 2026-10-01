import { JobCardSkeleton } from '../ui/skeleton';
import { useSearchStore } from '../../store/useSearchStore';

/**
 * Animated "engine at work" state shown while a search is running:
 * radar sweep + current pipeline stage, then skeleton cards.
 */
export function SearchProgress() {
  const stage = useSearchStore((s) => s.searchStage);

  return (
    <div className="space-y-5">
      <div className="fade-up flex items-center gap-6 rounded-2xl border border-ink-200 bg-white p-6">
        {/* radar */}
        <div className="relative h-28 w-28 shrink-0" aria-hidden>
          <div className="absolute inset-0 rounded-full border-2 border-ink-200" />
          <div className="absolute inset-[18%] rounded-full border border-ink-200" />
          <div className="absolute inset-[36%] rounded-full border border-ink-200" />
          <div
            className="radar-sweep absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(8,145,178,0.55) 0deg, rgba(8,145,178,0.12) 70deg, transparent 90deg)',
            }}
          />
          <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600" />
        </div>
        <div className="min-w-0">
          <p className="pulse-soft text-[15px] font-semibold text-brand-700">{stage || 'Searching…'}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
            Scanning primary sources, ATS platforms and specialist boards — normalizing, deduplicating and scoring.
          </p>
        </div>
      </div>

      {[0, 1, 2].map((i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}
