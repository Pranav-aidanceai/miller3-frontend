import { cookies } from 'next/headers';
import { AxiosError } from 'axios';
import { NextResponse } from 'next/server';
import { EXPIRED_COOKIE } from '@/lib/api/authCookies';
import AXIOS from '@/lib/api/server';

const expiredCookie = EXPIRED_COOKIE;

/** Clears both auth cookies on the response, both ways (see below). */
async function signedOutResponse() {
    // Set the expiry headers directly on the returned response. Relying on
    // the implicit cookies() store merge is unreliable on Azure's managed
    // functions, which left the cookies in place after logout.
    const response = NextResponse.json({ data: true }, { status: 200 });
    response.cookies.set('access_token', '', expiredCookie);
    response.cookies.set('refresh_token', '', expiredCookie);
    // Also clear them in the cookies() store: if the access token had expired,
    // the logout call above refreshed it first and wrote NEW tokens there,
    // which Next appends after the headers set above — the browser would end
    // up keeping the new tokens, still signed in.
    const cookieStore = await cookies();
    cookieStore.set('access_token', '', expiredCookie);
    cookieStore.set('refresh_token', '', expiredCookie);
    return response;
}

export async function POST() {
    try {
        // Ends this login session on the backend, including its refresh token.
        await AXIOS.post('/api/v1/auth/logout', {});
        return await signedOutResponse();
    } catch (error: unknown) {
        // A 401 here means the session was already over (e.g. SESSION_EXPIRED
        // from the refresh): the user is signed out either way.
        if (error instanceof AxiosError && error.response?.status === 401) {
            return await signedOutResponse();
        }
        console.error('error', error);
        const message = error instanceof Error ? error.message : 'Logout failed';
        return NextResponse.json(
            { data: null, errors: [{ message }] },
            { status: 500 }
        );
    }
}
