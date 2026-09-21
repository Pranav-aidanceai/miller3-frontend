import { Skeleton } from '@/components/ui/skeleton';

/**
 * Fallback for the authenticated shell's content area while a module
 * page's server data resolves. Scoped the same way as (modules)/error.tsx
 * — the sidebar/top bar (part of the layout, not `children`) stay
 * mounted; only this content region shows the skeleton. Generic by
 * design; data-heavy screens (dashboard, PDP, tables) get their own
 * more specific loading.tsx as they're rebuilt against the new design.
 */
export default function ModuleLoading() {
    return (
        <div className="h-full space-y-4 overflow-hidden p-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
        </div>
    );
}
