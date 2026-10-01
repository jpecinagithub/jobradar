import { X } from 'lucide-react';
import { cn } from '../ui/cn';

interface FilterChipProps {
  label: string;
  onRemove?: () => void;
  tone?: 'default' | 'hard' | 'soft' | 'exclude';
  prefix?: string;
}

const tones: Record<NonNullable<FilterChipProps['tone']>, string> = {
  default: 'bg-brand-50 text-brand-700 border-brand-600/30',
  hard: 'bg-danger-50 text-danger-600 border-red-300',
  soft: 'bg-violet-50 text-accent-600 border-violet-200',
  exclude: 'bg-ink-100 text-ink-500 border-ink-300 line-through',
};

export function FilterChip({ label, onRemove, tone = 'default', prefix }: FilterChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium',
        tones[tone],
      )}
    >
      {prefix && <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{prefix}</span>}
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="rounded p-0.5 transition-colors hover:bg-black/10"
        >
          <X size={13} />
        </button>
      )}
    </span>
  );
}
