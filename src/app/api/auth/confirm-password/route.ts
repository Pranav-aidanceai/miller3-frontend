import axios from 'axios';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/api/authError';
import { forwardedForHeader } from '@/lib/api/clientIp';
const API_URL = process.env.API_BASE_URL;

// Deliberately NOT routed through the shared src/lib/api/server.ts instance —
// see the identical note in ../verify-otp/route.ts: this is a pre-auth flow,
// and that instance's 401-retry-via-refresh logic would misinterpret a
// legitimate "invalid/expired reset code" 401 as an expired session.
export async function POST(req: Request) {
    try {
        const data = await req.json();

        const payload = {
            email: data.email,
            new_password: data.new_password
        }

        const response = await axios.post(`${API_URL}/api/v1/auth/reset-password/complete`, payload, {
            headers: await forwardedForHeader(),
        });

        return NextResponse.json({
            data: response.data
        }, {
            status: response.status || 200
        })

    } catch (error: unknown) {
        console.error('error', error);
        // Passes the backend's status, errors and Retry-After through (429
        // rate limits, 413 body too large, …) — see src/lib/api/authError.ts.
        return authErrorResponse(error, 'Failed to reset password');
    }
}
