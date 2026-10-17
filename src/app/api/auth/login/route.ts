import axios from 'axios';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/api/authError';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/api/authCookies';
import { forwardedForHeader } from '@/lib/api/clientIp';

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
            { headers: { 'Content-Type': 'application/json', ...(await forwardedForHeader()) } }
        );

        const { access_token, refresh_token, role, user_details, role_details, credits_left } = response.data?.data;

        const nextResponse = NextResponse.json(
            { data: { role, user_details, role_details, credits_left } },
            { status: response.status || 200 }
        );

        nextResponse.cookies.set('access_token', access_token, ACCESS_TOKEN_COOKIE);
        nextResponse.cookies.set('refresh_token', refresh_token, REFRESH_TOKEN_COOKIE);

        return nextResponse;
    } catch (error: unknown) {
        console.error('error', error);
        // Passes the backend's status, errors and Retry-After through (429
        // rate limits, 413 body too large, …) — see src/lib/api/authError.ts.
        return authErrorResponse(error, 'Login failed');
    }
}
