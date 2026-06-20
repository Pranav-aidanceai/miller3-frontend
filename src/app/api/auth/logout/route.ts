import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import AXIOS from '@/lib/axios';

export async function POST() {
    // Best-effort backend logout (AXIOS request interceptor attaches the access
    // token from cookies). Even if it fails — e.g. the token is already invalid
    // or the account was deactivated and the backend returns 403 — we must still
    // clear the local cookies so the user is logged out client-side.
    try {
        await AXIOS.post('/api/v1/auth/logout', {});
    } catch (error: unknown) {
        console.error('backend logout failed, clearing local session anyway', error);
    }

    const cookieStore = await cookies();
    cookieStore.delete({ name: 'access_token', path: '/' });
    cookieStore.delete({ name: 'refresh_token', path: '/' });

    return NextResponse.json({ data: true }, { status: 200 });
}
