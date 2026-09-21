import { Skeleton } from '@/components/ui/skeleton';

export default function AddCompanyLoading() {
  return (
    <div className="flex flex-col p-6" style={{ height: 'calc(100vh - 3rem)' }}>
      <div className="shrink-0">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>

      <div className="mt-5 flex-1 space-y-6">
        <div>
          <Skeleton className="mb-2 h-4 w-32" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-end gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    </div>
  );
}
