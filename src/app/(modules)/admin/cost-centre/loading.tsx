import { Skeleton } from '@/components/ui/skeleton';

export default function CostCenterLoading() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-52" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-10 w-40" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-8 w-16" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`rounded-xl border border-border bg-card p-5 shadow-sm ${i === 1 ? 'md:col-span-2' : ''}`}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
