import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from './cn';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900',
        'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
