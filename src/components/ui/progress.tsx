import { cn } from './cn';

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  barClassName?: string;
}

export function Progress({ value, className, barClassName }: ProgressProps) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-ink-100', className)}>
      <div
        className={cn('h-full rounded-full bg-brand-600 transition-all duration-500', barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
