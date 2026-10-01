import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '../../ui/cn';

interface ChipInputProps {
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  chipTone?: 'default' | 'soft' | 'exclude' | 'hard';
  prefix?: string;
}

const tones = {
  default: 'bg-brand-50 text-brand-700 border-brand-600/30',
  soft: 'bg-violet-50 text-accent-600 border-violet-200',
  exclude: 'bg-ink-100 text-ink-500 border-ink-300',
  hard: 'bg-danger-50 text-danger-600 border-red-300',
};

export function ChipInput({ values, onChange, suggestions = [], placeholder, chipTone = 'default', prefix }: ChipInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useRef(`dl_${Math.random().toString(36).slice(2)}`).current;

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v || values.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...values, v]);
    setText('');
  };

  const filtered = text
    ? suggestions.filter((s) => s.toLowerCase().includes(text.toLowerCase()) && !values.includes(s)).slice(0, 8)
    : [];

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium', tones[chipTone])}
          >
            {prefix && <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">{prefix}</span>}
            <span className={chipTone === 'exclude' ? 'line-through' : ''}>{v}</span>
            <button
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="rounded p-0.5 transition-colors hover:bg-black/10"
            >
              <X size={13} />
            </button>
          </span>
        ))}
        <div className="relative min-w-[160px] flex-1">
          <input
            ref={inputRef}
            value={text}
            list={listId}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); add(text); }
              if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1));
            }}
            onBlur={() => { if (text.trim()) add(text); }}
            placeholder={placeholder ?? 'Type and press Enter…'}
            className="h-9 w-full rounded-lg border border-dashed border-ink-300 bg-transparent px-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
          />
          <datalist id={listId}>
            {filtered.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
      </div>
    </div>
  );
}

export function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-ink-300 px-2.5 py-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:border-brand-600 hover:text-brand-700"
    >
      <Plus size={13} /> {label}
    </button>
  );
}
