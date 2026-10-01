import { cn } from './cn';

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
}

export function Switch({ checked, onChange, label, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <span
        className={cn(
          'relative inline-flex h-5.5 w-10 shrink-0 rounded-full transition-colors h-[22px]',
          checked ? 'bg-brand-600' : 'bg-ink-300',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-[3px]',
          )}
        />
      </span>
      {label && <span className="text-sm text-ink-700">{label}</span>}
    </button>
  );
}
