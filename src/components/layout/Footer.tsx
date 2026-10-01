import { Radar } from 'lucide-react';
import { BRAND } from '../../lib/types';

export function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900 text-brand-500">
            <Radar size={15} />
          </span>
          <div className="text-[12px] text-ink-500">
            <span className="font-semibold text-ink-800">{BRAND.name}</span> · {BRAND.claim}
          </div>
        </div>
        <p className="text-[12px] text-ink-400">
          No ads. No sponsored results. Ranked by relevance, freshness and source quality only.
        </p>
      </div>
    </footer>
  );
}
