import { Skeleton } from '@/components/ui/skeleton';

export default function SearchHistoryLoading() {
  return (
    <div className="flex flex-col p-5" style={{ height: 'calc(100vh - 3rem)' }}>
      <div className="shrink-0 flex items-center justify-between gap-4 border-b border-border pb-3">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <div className="mt-2 flex-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start justify-between gap-4 border-b border-border py-4">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-48" />
            </div>
            <Skeleton className="h-4 w-24 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
