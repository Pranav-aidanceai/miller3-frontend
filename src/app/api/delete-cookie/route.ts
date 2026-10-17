import { NextResponse } from 'next/server';
import { EXPIRED_COOKIE } from '@/lib/api/authCookies';

const expiredCookie = EXPIRED_COOKIE;

export async function POST() {
    try {
        const response = NextResponse.json({ data: true }, { status: 200 });
        response.cookies.set('access_token', '', expiredCookie);
        response.cookies.set('refresh_token', '', expiredCookie);
        return response;

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete cookies';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
