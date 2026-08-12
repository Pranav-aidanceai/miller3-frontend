// Central hub for the "your account was deactivated" (HTTP 403) teardown.
//
// Both axios calls (caught by SessionGuard's interceptor) and native fetch
// calls (export, batch enrichment) funnel through `triggerSessionExpired()` so
// the deactivation modal shows regardless of how the request was made.
//
// `isSessionExpiring()` lets per-call error handlers skip their own "failed to…"
// toasts while the teardown is in progress.

let sessionExpiring = false;
let handler: (() => void) | null = null;

/** SessionGuard registers the callback that opens the modal + starts logout. */
export function setSessionExpiryHandler(fn: (() => void) | null) {
    handler = fn;
}

/** Begin the deactivation teardown. Idempotent — only the first call fires. */
export function triggerSessionExpired() {
    if (sessionExpiring) return;
    sessionExpiring = true;
    handler?.();
}

export function isSessionExpiring() {
    return sessionExpiring;
}

export function resetSessionExpiring() {
    sessionExpiring = false;
}

/** Where the search page parks its filters/results so a drawer round-trip survives. */
export const SEARCH_STATE_KEY = 'miller3:search-state';

/**
 * Drop the cached search state. Called on every logout so the next account to
 * sign in on this tab does not inherit the previous one's filters and results.
 */
export function clearSearchState() {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(SEARCH_STATE_KEY);
    } catch { /* storage unavailable — nothing cached to clear */ }
}
