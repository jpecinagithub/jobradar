import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}

export function Dialog({ open, onClose, title, description, children, className, wide }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', fn);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px] fade-up" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full rounded-2xl bg-white shadow-2xl fade-up max-h-[90vh] flex flex-col',
          wide ? 'max-w-4xl' : 'max-w-lg',
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-ink-100">
            <div>
              {title && <h3 className="text-base font-semibold text-ink-900">{title}</h3>}
              {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto nice-scroll px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
