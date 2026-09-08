'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Error boundary for the authenticated shell (search/buckets/admin/etc).
 * Because src/app/(modules)/layout.tsx renders ModuleShell around
 * `children`, and Next.js's error boundary wraps only `children` (not the
 * layout itself), a crash in one module page replaces just the content
 * area — the sidebar and top bar stay mounted and usable.
 */
export default function ModuleError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-full min-h-[50vh] items-center justify-center p-6">
            <Alert variant="destructive" className="max-w-md p-6">
                <AlertTriangle />
                <AlertTitle className="text-base">This page hit a problem</AlertTitle>
                <AlertDescription>
                    <p>Something went wrong loading this section. The rest of the app is unaffected — you can try again or navigate elsewhere.</p>
                    <Button onClick={reset} size="sm" className="mt-4">Try again</Button>
                </AlertDescription>
            </Alert>
        </div>
    );
}
