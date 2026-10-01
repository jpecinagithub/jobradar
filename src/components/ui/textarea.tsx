import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900',
        'placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
