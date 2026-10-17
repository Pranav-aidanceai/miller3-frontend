import axios from 'axios';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/api/authError';
import { forwardedForHeader } from '@/lib/api/clientIp';

const API_URL = process.env.API_BASE_URL;

// Deliberately NOT routed through the shared src/lib/api/server.ts instance
// — same reasoning as ../login/route.ts: this is a pre-auth call, and a
// validation failure (e.g. email already registered) commonly comes back
// as a 401/403 that must not be mistaken for an expired session.
export async function POST(req: Request) {
    try {
        const { name, email, password, confirmPassword, role, tou } = await req.json();

        const response = await axios.post(
            `${API_URL}/api/v1/auth/register`,
            {
                full_name: name,
                email,
                password,
                confirm_password: confirmPassword,
                user_tier_requested: role,
                tou_accepted: tou,
            },
            { headers: { 'Content-Type': 'application/json', ...(await forwardedForHeader()) } }
        );

        return NextResponse.json({ data: response.data?.data }, { status: response.status || 200 });
    } catch (error: unknown) {
        console.error('error', error);
        // Passes the backend's status, errors and Retry-After through (429
        // rate limits, 413 body too large, …) — see src/lib/api/authError.ts.
        return authErrorResponse(error, 'Registration failed');
    }
}
