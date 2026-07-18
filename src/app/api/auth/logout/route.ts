import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import AXIOS from '@/lib/axios';

export async function POST() {

    try {
        await AXIOS.post('/api/v1/auth/logout', {});
    } catch (error: unknown) {
        console.error('backend logout failed, clearing local session anyway', error);
    }

    const cookieStore = await cookies();
    cookieStore.delete({ name: 'access_token', path: '/' });
    cookieStore.delete({ name: 'refresh_token', path: '/' });

    return NextResponse.json({ data: true }, { status: 200 });
}
