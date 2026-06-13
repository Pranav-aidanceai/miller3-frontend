import { NextResponse } from 'next/server';
import AXIOS from '@/lib/axios';

const expiredCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 0,
};

export async function POST() {
    try {
        await AXIOS.post('/api/v1/auth/logout', {});
        // Set the expiry headers directly on the returned response. Relying on
        // the implicit cookies() store merge is unreliable on Azure's managed
        // functions, which left the cookies in place after logout.
        const response = NextResponse.json({ data: true }, { status: 200 });
        response.cookies.set('access_token', '', expiredCookie);
        response.cookies.set('refresh_token', '', expiredCookie);
        return response;
    } catch (error: unknown) {
        console.error('error', error);
        const message = error instanceof Error ? error.message : 'Logout failed';
        return NextResponse.json(
            { data: null, errors: [{ message }] },
            { status: 500 }
        );
    }
}