import type { LabelHTMLAttributes } from 'react';
import { cn } from './cn';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('mb-1.5 block text-[13px] font-medium text-ink-700', className)} {...props} />
  );
}
