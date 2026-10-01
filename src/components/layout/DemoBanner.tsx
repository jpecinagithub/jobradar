import { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { getPreferences, savePreferences } from '../../lib/storage';
import { DEMO_MODE } from '../../lib/demoJobs';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(() => getPreferences().demoNoticeDismissed);
  if (!DEMO_MODE || dismissed) return null;
  return (
    <div className="border-b border-amber-200 bg-warning-50">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
        <FlaskConical size={15} className="shrink-0 text-amber-700" />
        <p className="text-[12.5px] text-amber-800">
          <strong className="font-semibold">DEMO DATA</strong>
          <span className="hidden sm:inline"> — listings shown are a realistic sample. Connect real sources in Admin → Sources to go live.</span>
          <span className="sm:hidden"> — sample listings.</span>
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
