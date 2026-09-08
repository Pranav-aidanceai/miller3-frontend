import { Skeleton } from '@/components/ui/skeleton';

export default function UsersLoading() {
  return (
    <div className="px-6 pt-3 h-full max-h-screen overflow-auto">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="mt-6 rounded-lg border border-border overflow-hidden">
        <div className="space-y-2 p-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
