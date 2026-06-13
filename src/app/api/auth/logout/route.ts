import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import AXIOS from '@/lib/axios';

export async function POST() {
    try {
        await AXIOS.post('/api/v1/auth/logout', {});
        const cookieStore = await cookies();
        cookieStore.delete({ name: 'access_token', path: '/' });
        cookieStore.delete({ name: 'refresh_token', path: '/' });
        return NextResponse.json({ data: true }, { status: 200 });
    } catch (error: unknown) {
        console.error('error', error);
        const message = error instanceof Error ? error.message : 'Logout failed';
        return NextResponse.json(
            { data: null, errors: [{ message }] },
            { status: 500 }
        );
    }
}