import type { NextRequest } from 'next/server';

// Cross-site request forgery (CSRF) guard for this app's /api/* routes.
//
// The session lives in cookies, which the browser attaches to every request to
// this site — including ones another website triggers (a hidden form posting
// to /api/bucket, a fetch() from a malicious page). This check rejects
// state-changing requests that a browser reports as coming from another site.
//
// It is NOT a defence against non-browser clients (curl, Thunder Client): they
// can send any headers they like, and a request carrying a valid session
// cookie is that user by definition. Authorization for those is the backend's
// job. What this stops is someone else's website acting through a logged-in
// user's browser.

/** Reads never change state, so they don't need the check. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * The host the browser addressed. Behind a proxy (App Service, Vercel) the
 * original host may arrive as X-Forwarded-Host; Next.js applies the same
 * Origin-vs-host comparison to Server Actions.
 */
function requestHosts(request: NextRequest): string[] {
    const hosts = [
        request.headers.get('x-forwarded-host')?.split(',')[0]?.trim(),
        request.headers.get('host')?.trim(),
        request.nextUrl.host,
    ];
    return hosts.filter((h): h is string => !!h).map((h) => h.toLowerCase());
}

export function isCrossSiteRequest(request: NextRequest): boolean {
    if (SAFE_METHODS.has(request.method.toUpperCase())) return false;

    // Modern browsers (Chrome 76+, Firefox 90+, Safari 16.4+) label every
    // request with where it came from, and pages can't override it. Our own
    // pages calling our own /api are always "same-origin".
    const fetchSite = request.headers.get('sec-fetch-site');
    if (fetchSite) return fetchSite !== 'same-origin';

    // Older browsers: they still send Origin on every cross-origin POST/PUT/
    // PATCH/DELETE, so compare its host with the host that was requested.
    const origin = request.headers.get('origin');
    if (origin) {
        let originHost: string;
        try {
            originHost = new URL(origin).host.toLowerCase();
        } catch {
            return true; // "null" (sandboxed iframe, file://) or garbage
        }
        return !requestHosts(request).includes(originHost);
    }

    // Neither header: not a browser acting on another site's behalf
    // (browsers always send at least one of them on these methods).
    return false;
}
