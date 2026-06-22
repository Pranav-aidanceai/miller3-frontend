import axios from 'axios';

/**
 * Single source of truth for turning an API failure into a clean, human-readable
 * message. It copes with every error shape this app produces:
 *
 *   - route-handler wrapper:  { error: "<json string>" }  or  { error: {object} }
 *   - forwarded backend body: { error_code, detail }       (e.g. ACCOUNT_DEACTIVATED)
 *   - validation/quota body:  { errors: [{ code, message, field }] }
 *   - plain strings / { detail } / { message }
 *
 * Use `getErrorMessage` when you only need text to show; use `getApiError` when
 * you also need the `code` (e.g. to detect INSUFFICIENT_CREDITS).
 */
function fromBody(data: unknown, fallback: string): { message: string; code: string | null } {
    if (data == null) return { message: fallback, code: null };

    // Strings may themselves be JSON the route handler stringified.
    if (typeof data === 'string') {
        const trimmed = data.trim();
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object') return fromBody(parsed, fallback);
        } catch { /* not JSON — treat as plain text */ }
        return { message: trimmed || fallback, code: null };
    }

    if (typeof data === 'object') {
        const o = data as Record<string, unknown>;

        // { errors: [{ code, message/detail }] }
        if (Array.isArray(o.errors) && o.errors.length > 0) {
            const first = (o.errors[0] ?? {}) as Record<string, unknown>;
            const message =
                (typeof first.message === 'string' && first.message) ||
                (typeof first.detail === 'string' && first.detail) ||
                fallback;
            return { message, code: typeof first.code === 'string' ? first.code : null };
        }

        // Route-handler wrapper: { error: <string|object> }
        if (o.error != null) {
            const inner = fromBody(o.error, '');
            if (inner.message) {
                return {
                    message: inner.message,
                    code: inner.code ?? (typeof o.error_code === 'string' ? o.error_code : null),
                };
            }
        }

        const code = typeof o.error_code === 'string' ? o.error_code : null;
        if (typeof o.detail === 'string' && o.detail) return { message: o.detail, code };
        if (typeof o.message === 'string' && o.message) return { message: o.message, code };
    }

    return { message: fallback, code: null };
}

export function getApiError(
    err: unknown,
    fallback = 'Something went wrong',
): { message: string; code: string | null } {
    if (axios.isAxiosError(err)) {
        // Use the response body; for a bodiless failure (e.g. network error) the
        // caller's fallback reads better than axios's "Request failed with…".
        return fromBody(err.response?.data, fallback);
    }
    if (err instanceof Error && err.message) {
        return { message: err.message, code: null };
    }
    // Some service helpers hand back a plain error body instead of throwing.
    return fromBody(err, fallback);
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
    return getApiError(err, fallback).message;
}
