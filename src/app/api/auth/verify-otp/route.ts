import axios, { AxiosError } from 'axios';
import { NextResponse } from 'next/server';
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

        const response = await axios.post(`${API_URL}/api/v1/auth/reset-password/verify-otp`, payload);

        return NextResponse.json({
            data: response.data
        }, {
            status: response.status || 200
        })

    } catch (error: unknown) {
        console.error("error", error)
        if (error instanceof AxiosError) {
            let errorData = error?.response?.data;
            if (typeof errorData === 'object') {
                errorData = JSON.stringify(errorData);
            }
            return NextResponse.json(
                { error: errorData || 'An error occurred' },
                {
                    status: error.response?.status || 500
                });
        } else if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, {
                status: 500
            });
        } else {
            return NextResponse.json({ error: error }, {
                status: 500
            });
        }
    }
}