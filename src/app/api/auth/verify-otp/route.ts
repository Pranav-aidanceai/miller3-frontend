import axios from 'axios';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/api/authError';
import { forwardedForHeader } from '@/lib/api/clientIp';
const API_URL = process.env.API_BASE_URL;

// Deliberately NOT routed through the shared src/lib/api/server.ts instance:
// this is a pre-auth flow (the user has no session yet), and that instance's
// response interceptor treats any plain 401 as an expired session worth
// retrying via refresh — which would swallow a legitimate "wrong/expired
// OTP" 401 here and reject with a bare error array instead of the original
// AxiosError, corrupting the status/body this route forwards to the client.
export async function POST(req: Request) {
    try {
        const data = await req.json();

        const payload = {
            email: data.email,
            otp: data.otp
        }

        const response = await axios.post(`${API_URL}/api/v1/auth/reset-password/verify-otp`, payload, {
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
        return authErrorResponse(error, 'Invalid or expired code');
    }
}
