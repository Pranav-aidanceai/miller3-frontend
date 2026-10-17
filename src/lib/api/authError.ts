import { AxiosError } from 'axios';
import { NextResponse } from 'next/server';
import { getApiError } from '@/lib/apiError';

// Server-only. Turns a failed backend auth call into this app's response,
// keeping the three things the auth screens rely on:
//   - the backend's status (429 rate limit, 413 body too large, 401, …)
//   - its errors as `{ errors: [{ code, message, field }] }`, so codes like
//     TOO_MANY_ATTEMPTS / ACCOUNT_PENDING and the ready-to-show message survive
//   - the Retry-After header, which drives the submit-button countdown.
export function authErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
    if (error instanceof AxiosError) {
        const data = error.response?.data;
        const errors = Array.isArray(data?.errors) && data.errors.length > 0
            ? data.errors
            : (() => {
                // Bodies not in the { errors: [...] } shape, e.g. { detail }.
                const { message, code } = getApiError(error, fallbackMessage);
                return [{ message, ...(code ? { code } : {}) }];
            })();

        const headers = new Headers();
        const retryAfter = error.response?.headers?.['retry-after'];
        if (retryAfter != null) headers.set('Retry-After', String(retryAfter));

        return NextResponse.json(
            { errors },
            { status: error.response?.status || 500, headers }
        );
    }
    if (error instanceof Error) {
        return NextResponse.json({ errors: [{ message: error.message }] }, { status: 500 });
    }
    return NextResponse.json({ errors: [{ message: 'Something went wrong' }] }, { status: 500 });
}
