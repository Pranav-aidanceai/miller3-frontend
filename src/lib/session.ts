// Central hub for the forced sign-out teardown. Two things end a session from
// the server's side:
//
//   - `deactivated`  — HTTP 403, the admin disabled the account.
//   - `role-changed` — HTTP 401 + `error_code: "ROLE_CHANGED"`, the admin moved
//     the user to another tier, so the access token's claims are stale and only
//     a fresh login can pick up the new permissions.
//
// Every axios call funnels through SessionGuard's interceptor into
// `triggerSessionExpired()` so the modal shows regardless of which call failed.
//
// `isSessionExpiring()` lets per-call error handlers skip their own "failed to…"
// toasts while the teardown is in progress.

export type SessionEndReason = 'deactivated' | 'role-changed';

let sessionExpiring = false;
let handler: ((reason: SessionEndReason) => void) | null = null;

/** SessionGuard registers the callback that opens the modal + starts logout. */
export function setSessionExpiryHandler(fn: ((reason: SessionEndReason) => void) | null) {
    handler = fn;
}

/**
 * Begin the forced sign-out teardown. Idempotent — only the first call fires,
 * so a burst of parallel requests failing at once still shows one modal.
 */
export function triggerSessionExpired(reason: SessionEndReason = 'deactivated') {
    if (sessionExpiring) return;
    sessionExpiring = true;
    handler?.(reason);
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
