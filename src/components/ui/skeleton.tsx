import { cn } from './cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer rounded-lg', className)} />;
}

export function JobCardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
          <Skeleton className="mt-1 h-4 w-1/4" />
        </div>
        <Skeleton className="h-10 w-16 rounded-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}
