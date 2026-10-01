import { useState, type ReactNode } from 'react';
import { cn } from './cn';

interface TabsProps {
  tabs: { id: string; label: ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 rounded-xl bg-ink-100 p-1', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-all whitespace-nowrap',
            active === t.id
              ? 'bg-white text-ink-900 shadow-sm'
              : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function useTabs<T extends string>(initial: T) {
  const [active, setActive] = useState<T>(initial);
  return { active, setActive };
}
