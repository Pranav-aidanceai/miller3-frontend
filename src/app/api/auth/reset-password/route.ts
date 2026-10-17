import axios from 'axios';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/api/authError';
import { forwardedForHeader } from '@/lib/api/clientIp';

const API_URL = process.env.API_BASE_URL;

// Initial step of the forgot-password flow (send the OTP code) — see
// ../verify-otp/route.ts and ../confirm-password/route.ts for the rest of
// it. Deliberately NOT routed through the shared src/lib/api/server.ts
// instance for the same reason as those two: this is a pre-auth call, and
// a "no account with this email" 401 must not be mistaken for an expired
// session.
export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        const response = await axios.post(
            `${API_URL}/api/v1/auth/reset-password`,
            { email },
            { headers: { 'Content-Type': 'application/json', ...(await forwardedForHeader()) } }
        );

        return NextResponse.json({ data: response.data?.data }, { status: response.status || 200 });
    } catch (error: unknown) {
        console.error('error', error);
        // Passes the backend's status, errors and Retry-After through (429
        // rate limits, 413 body too large, …) — see src/lib/api/authError.ts.
        return authErrorResponse(error, 'Password reset failed');
    }
}
