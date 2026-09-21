import { AxiosError } from 'axios';
import AXIOS from '@/lib/api/server';
import { NextResponse } from 'next/server';

// Unlike login/register/reset-password, this is a genuinely authenticated,
// post-login call — routed through the shared instance so the
// Authorization header is attached automatically and a plain expired-token
// 401 gets the normal single-retry-via-refresh treatment every other
// authenticated route already gets.
export async function PATCH() {
    try {
        const response = await AXIOS.patch('/api/v1/auth/onboarding/complete', {});
        return NextResponse.json({ data: response.data?.data }, { status: response.status || 200 });
    } catch (error: unknown) {
        console.error('error', error);
        if (error instanceof AxiosError) {
            return NextResponse.json(
                { errors: error.response?.data?.errors ?? [{ message: 'Onboarding failed' }] },
                { status: error.response?.status || 500 }
            );
        }
        if (error instanceof Error) {
            return NextResponse.json({ errors: [{ message: error.message }] }, { status: 500 });
        }
        return NextResponse.json({ errors: [{ message: 'Something went wrong' }] }, { status: 500 });
    }
}
