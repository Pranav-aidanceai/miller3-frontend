import axios, { AxiosError } from 'axios';
import { NextResponse } from 'next/server';

const API_URL = process.env.API_BASE_URL;

// Deliberately NOT routed through the shared src/lib/api/server.ts instance
// — same reasoning as ../verify-otp/route.ts and ../confirm-password/route.ts:
// this is a pre-auth call, and that instance's 401-retry-via-refresh logic
// would misinterpret a legitimate "wrong email/password" 401 as an expired
// session, rejecting with a bare error array instead of the original
// AxiosError and corrupting the status/body this route forwards to the
// client.
export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        const response = await axios.post(
            `${API_URL}/api/v1/auth/login`,
            { email, password },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const { access_token, refresh_token, role, user_details, role_details, credits_left } = response.data?.data;

        const nextResponse = NextResponse.json(
            { data: { role, user_details, role_details, credits_left } },
            { status: response.status || 200 }
        );

        nextResponse.cookies.set('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });
        nextResponse.cookies.set('refresh_token', refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return nextResponse;
    } catch (error: unknown) {
        console.error('error', error);
        if (error instanceof AxiosError) {
            return NextResponse.json(
                { errors: error.response?.data?.errors ?? [{ message: 'Login failed' }] },
                { status: error.response?.status || 500 }
            );
        }
        if (error instanceof Error) {
            return NextResponse.json({ errors: [{ message: error.message }] }, { status: 500 });
        }
        return NextResponse.json({ errors: [{ message: 'Something went wrong' }] }, { status: 500 });
    }
}
