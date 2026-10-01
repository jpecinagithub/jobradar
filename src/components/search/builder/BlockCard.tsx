import type { ReactNode } from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { cn } from '../../ui/cn';

interface BlockCardProps {
  title: string;
  hint?: string;
  hard?: boolean;
  onToggleHard?: () => void;
  hardLabel?: string;
  children: ReactNode;
  className?: string;
}

export function BlockCard({ title, hint, hard, onToggleHard, hardLabel, children, className }: BlockCardProps) {
  return (
    <section className={cn('rounded-2xl border border-ink-200 bg-white p-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-900">{title}</h3>
          {hint && <p className="mt-0.5 text-[12.5px] text-ink-400">{hint}</p>}
        </div>
        {onToggleHard && (
          <button
            onClick={onToggleHard}
            title={hard ? 'Hard filter: jobs missing this are excluded' : 'Soft filter: only affects the score'}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-all',
              hard
                ? 'border-red-300 bg-danger-50 text-danger-600'
                : 'border-ink-200 bg-ink-50 text-ink-500 hover:border-violet-300 hover:text-accent-600',
            )}
          >
            {hard ? <ShieldAlert size={12} /> : <Sparkles size={12} />}
            {hard ? (hardLabel ?? 'Hard') : 'Soft'}
          </button>
        )}
        {onToggleHard === undefined && hard !== undefined && (
          <Badge variant={hard ? 'danger' : 'violet'}>{hard ? 'Hard' : 'Soft'}</Badge>
        )}
      </div>
      {children}
    </section>
  );
}
