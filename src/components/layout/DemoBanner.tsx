import { useState } from 'react';
import { FlaskConical, Radio, X } from 'lucide-react';
import { getPreferences, savePreferences } from '../../lib/storage';
import { DEMO_MODE } from '../../lib/demoJobs';
import { timeAgo } from '../../lib/normalize';
import { useSearchStore } from '../../store/useSearchStore';

export function DemoBanner() {
  const dataMode = useSearchStore((s) => s.dataMode);
  const liveInfo = useSearchStore((s) => s.liveInfo);
  const liveError = useSearchStore((s) => s.liveError);
  const [dismissed, setDismissed] = useState(() => getPreferences().demoNoticeDismissed);

  if (dataMode === 'live') {
    if (liveError && !liveInfo) {
      return (
        <div className="border-b border-red-200 bg-red-50">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
            <Radio size={15} className="shrink-0 text-red-700" />
            <p className="text-[12.5px] text-red-800">
              <strong className="font-semibold">LIVE</strong>
              <span> — {liveError}</span>
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="border-b border-emerald-200 bg-emerald-50">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
          </span>
          <p className="text-[12.5px] text-emerald-900">
            <strong className="font-semibold">LIVE</strong>
            {liveInfo ? (
              <span>
                {' '}— {liveInfo.jobs.toLocaleString()} real listings from {liveInfo.companies} company boards
                {' '}· updated {timeAgo(liveInfo.fetchedAt)}
                {liveInfo.fromCache ? ' (cached)' : ''}.
              </span>
            ) : (
              <span> — real listings from connected company boards. Hit Search to fetch.</span>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (!DEMO_MODE || dismissed) return null;
  return (
    <div className="border-b border-amber-200 bg-warning-50">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
        <FlaskConical size={15} className="shrink-0 text-amber-700" />
        <p className="text-[12.5px] text-amber-800">
          <strong className="font-semibold">DEMO DATA</strong>
          <span className="hidden sm:inline"> — sample listings for testing, not real jobs. Switch to Live above Search to use real company boards.</span>
          <span className="sm:hidden"> — sample listings, not real jobs.</span>
        </p>
        <button
          aria-label="Dismiss"
          className="ml-auto rounded p-1 text-amber-700 hover:bg-amber-100"
          onClick={() => {
            savePreferences({ ...getPreferences(), demoNoticeDismissed: true });
            setDismissed(true);
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
