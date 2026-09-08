import axios, { AxiosError } from 'axios';
import { NextResponse } from 'next/server';

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
            { headers: { 'Content-Type': 'application/json' } }
        );

        return NextResponse.json({ data: response.data?.data }, { status: response.status || 200 });
    } catch (error: unknown) {
        console.error('error', error);
        if (error instanceof AxiosError) {
            return NextResponse.json(
                { errors: error.response?.data?.errors ?? [{ message: 'Password reset failed' }] },
                { status: error.response?.status || 500 }
            );
        }
        if (error instanceof Error) {
            return NextResponse.json({ errors: [{ message: error.message }] }, { status: 500 });
        }
        return NextResponse.json({ errors: [{ message: 'Something went wrong' }] }, { status: 500 });
    }
}
