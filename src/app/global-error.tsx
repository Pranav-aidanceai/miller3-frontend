'use client';

import { useEffect } from 'react';

/**
 * Last-resort fallback for a crash in the root layout itself (fonts,
 * theme provider, Redux provider, etc). Deliberately does NOT depend on
 * the design system, Tailwind classes, or any provider — if the layout
 * that sets those up is what crashed, none of that can be trusted to
 * still work. Must define its own <html>/<body> per Next.js convention.
 */
export default function GlobalError({
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
        <html lang="en">
            <body
                style={{
                    display: 'flex',
                    minHeight: '100vh',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'system-ui, sans-serif',
                    padding: '1.5rem',
                    background: '#F6F8FA',
                    color: '#1E1E1E',
                }}
            >
                <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Something went wrong
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '1.5rem' }}>
                        The application failed to load. Please try again — if this keeps happening,
                        contact support.
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            height: '2.5rem',
                            padding: '0 1.25rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: '#005F73',
                            color: '#fff',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
