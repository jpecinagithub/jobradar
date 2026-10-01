import { ExternalLink } from 'lucide-react';
import type { Job } from '../../lib/types';
import { Button } from '../ui/button';

export function ApplyButton({ job, size = 'md', className }: { job: Job; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const label = job.originalUrl || (job.originalSource && job.originalSource !== job.source)
    ? 'Apply on company website'
    : 'Apply';
  return (
    <Button
      variant="brand"
      size={size}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        window.open(job.originalUrl ?? job.applyUrl, '_blank', 'noopener,noreferrer');
      }}
    >
      {label}
      <ExternalLink size={14} />
    </Button>
  );
}
