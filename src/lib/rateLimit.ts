import axios from 'axios';
import { getErrorMessage } from '@/lib/apiError';

// Shared by the browser and the server. The backend rate-limits the public
// auth endpoints and answers 429 with a ready-to-show message in
// errors[0].message plus a `Retry-After` header (seconds).

/** Used when a 429 arrives without a usable Retry-After. */
export const DEFAULT_RETRY_AFTER_SECONDS = 60;

const DEFAULT_RATE_LIMIT_MESSAGE = 'Too many attempts. Please try again later.';

/**
 * Seconds to wait from a Retry-After value — either delay-seconds ("120") or
 * an HTTP date. Returns null when absent or unparseable.
 */
export function parseRetryAfter(value: unknown, now = Date.now()): number | null {
    if (Array.isArray(value)) value = value[0];
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.ceil(value) : null;
    if (typeof value !== 'string' || value.trim() === '') return null;

    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);

    // An HTTP date always names the weekday and month; without letters,
    // Date.parse would accept junk like "-5" as a year.
    if (!/[a-z]/i.test(trimmed)) return null;
    const date = Date.parse(trimmed);
    if (Number.isNaN(date)) return null;
    return Math.max(0, Math.ceil((date - now) / 1000));
}

/**
 * For a 429 from this app's API: the message to show and how long to wait.
 * Null for anything else, so callers fall through to their normal handling.
 */
export function rateLimitFrom(error: unknown): { message: string; retryAfter: number } | null {
    if (!axios.isAxiosError(error) || error.response?.status !== 429) return null;
    return {
        message: getErrorMessage(error, DEFAULT_RATE_LIMIT_MESSAGE),
        retryAfter: parseRetryAfter(error.response.headers?.['retry-after']) ?? DEFAULT_RETRY_AFTER_SECONDS,
    };
}
