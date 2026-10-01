import { Badge } from '../ui/badge';
import type { JobStatus } from '../../lib/types';

const MAP: Record<JobStatus, { variant: 'success' | 'warning' | 'danger' | 'secondary'; label: string }> = {
  ACTIVE: { variant: 'success', label: 'Active' },
  MAY_BE_CLOSED: { variant: 'warning', label: 'May be closed' },
  CLOSED: { variant: 'danger', label: 'Closed' },
  UNKNOWN: { variant: 'secondary', label: 'Status unknown' },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const m = MAP[status];
  return (
    <Badge variant={m.variant}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </Badge>
  );
}
