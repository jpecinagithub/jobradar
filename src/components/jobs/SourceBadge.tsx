import type { Job } from '../../lib/types';
import { SOURCE_TYPE_LABEL, type SourceType } from '../../lib/types';
import { Badge } from '../ui/badge';
import { Building2, Cpu, Globe2, Layers, Search, Star } from 'lucide-react';

const ICONS: Record<SourceType, typeof Star> = {
  PRIMARY: Building2,
  ATS: Cpu,
  SPECIALIST_BOARD: Layers,
  OFFICIAL: Globe2,
  AGGREGATOR: Star,
  SEARCH_ENGINE: Search,
};

export function SourceBadge({ job, showOriginal = true }: { job: Job; showOriginal?: boolean }) {
  const Icon = ICONS[job.sourceType];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">
      <Badge variant="outline" className="gap-1">
        <Icon size={12} />
        {job.source}
      </Badge>
      <span className="text-ink-400">{SOURCE_TYPE_LABEL[job.sourceType]}</span>
      {showOriginal && job.originalSource && job.originalSource !== job.source && (
        <span className="text-ink-400">
          · originally <strong className="font-medium text-ink-600">{job.originalSource}</strong>
        </span>
      )}
    </span>
  );
}
