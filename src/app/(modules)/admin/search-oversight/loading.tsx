import { Skeleton } from '@/components/ui/skeleton';

export default function SearchOversightLoading() {
  return (
    <div className="h-full max-h-screen overflow-auto">
      <div className="py-3 px-4 border-b">
        <Skeleton className="h-7 w-44" />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between py-3 px-4 border-b">
        <Skeleton className="h-7 w-24" />
        <div className="flex gap-1">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-7 w-7" />
        </div>
      </div>

      <div className="space-y-2 px-4 py-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
