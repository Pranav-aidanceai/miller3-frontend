'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Root-segment error boundary — catches thrown render/data-fetching
 * exceptions under src/app/ (outside the authenticated shell, which has
 * its own boundary at src/app/(modules)/error.tsx). This is for genuinely
 * unexpected errors; session-expiry (403/401+ROLE_CHANGED) never reaches
 * here — it's caught proactively by the axios interceptor in
 * src/lib/api/client.ts before it ever becomes a thrown error.
 */
export default function Error({
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
        <div className="flex min-h-[60vh] items-center justify-center p-6">
            <Alert variant="destructive" className="max-w-md p-6">
                <AlertTriangle />
                <AlertTitle className="text-base">Something went wrong</AlertTitle>
                <AlertDescription>
                    <p>An unexpected error occurred while loading this page. You can try again, or head back to the homepage.</p>
                    <div className="mt-4 flex gap-2">
                        <Button onClick={reset} size="sm">Try again</Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/">Go home</Link>
                        </Button>
                    </div>
                </AlertDescription>
            </Alert>
        </div>
    );
}
