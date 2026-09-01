import { Skeleton } from '@/components/ui/skeleton';

/**
 * Root-segment loading UI — Next.js wraps the matching page in a Suspense
 * boundary with this as its fallback automatically. Generic by design
 * (covers the pre-auth screens: login/register/forgot-password); pages
 * with meaningful independent server data get their own more specific
 * loading.tsx alongside them.
 */
export default function Loading() {
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md space-y-4">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
}
