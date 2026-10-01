import { useState } from 'react';
import type { ScoredJob } from '../../lib/types';
import { Dialog } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { Check, AlertTriangle, X } from 'lucide-react';
import { cn } from '../ui/cn';

function ringColor(score: number): string {
  if (score >= 75) return '#12b76a';
  if (score >= 50) return '#0891b2';
  if (score >= 30) return '#f79009';
  return '#98a2b3';
}

export function MatchRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = ringColor(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`${score}% match — click to see why`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eaecf0" strokeWidth={5} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * score) / 100}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[13px] font-bold text-ink-900">{score}%</span>
        <span className="text-[8px] font-medium tracking-wide text-ink-400">MATCH</span>
      </div>
    </div>
  );
}

const WEIGHT_LABELS: Record<string, string> = {
  title: 'Job title match', location: 'Location match', skills: 'Skills match',
  experience: 'Experience match', language: 'Language match',
  industry: 'Industry match', seniority: 'Seniority match', workModel: 'Work model match',
};

export function MatchBadge({ scored }: { scored: ScoredJob }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(scored.breakdown) as [keyof typeof scored.breakdown, number][];
  const maxPts = Math.max(1, ...entries.map(([, v]) => v));

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full transition-transform hover:scale-105 active:scale-95" aria-label="Why this job matches">
        <MatchRing score={scored.score} />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Why this job matches" description={`${scored.job.title} · ${scored.job.company}`}>
        <div className="space-y-3">
          {entries.map(([k, pts]) => (
            <div key={k}>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="text-ink-700">{WEIGHT_LABELS[k]}</span>
                <span className="font-semibold text-ink-900">{pts}</span>
              </div>
              <Progress value={(pts / maxPts) * 100} barClassName={pts > 0 ? 'bg-brand-600' : 'bg-ink-200'} />
            </div>
          ))}
          <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
            <span className="text-sm font-semibold text-ink-900">Total match</span>
            <span className="text-lg font-bold" style={{ color: ringColor(scored.score) }}>{scored.score}%</span>
          </div>
          {scored.trace.matchedSynonyms.length > 0 && (
            <p className="text-[12px] text-ink-500">
              Semantic matches: {scored.trace.matchedSynonyms.join(' · ')}
            </p>
          )}
          <div className="space-y-1.5 border-t border-ink-100 pt-3">
            {scored.trace.checks.slice(0, 10).map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-[13px]">
                {c.status === 'pass' && <Check size={14} className="mt-0.5 shrink-0 text-success-600" />}
                {c.status === 'warn' && <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning-500" />}
                {c.status === 'fail' && <X size={14} className="mt-0.5 shrink-0 text-danger-600" />}
                <span className={cn(c.status === 'fail' ? 'text-ink-400 line-through' : 'text-ink-700')}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Dialog>
    </>
  );
}
