import type { HTMLAttributes } from 'react';
import { cn } from './cn';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'brand' | 'violet';

const styles: Record<BadgeVariant, string> = {
  default: 'bg-ink-900 text-white',
  secondary: 'bg-ink-100 text-ink-700',
  outline: 'border border-ink-300 bg-white text-ink-700',
  success: 'bg-success-50 text-success-600 border border-emerald-200',
  warning: 'bg-warning-50 text-amber-700 border border-amber-200',
  danger: 'bg-danger-50 text-danger-600 border border-red-200',
  brand: 'bg-brand-50 text-brand-700 border border-cyan-200',
  violet: 'bg-violet-50 text-accent-600 border border-violet-200',
};

export function Badge({
  className, variant = 'secondary', ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
