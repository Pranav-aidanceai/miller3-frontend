import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete({ name: 'access_token', path: '/' });
        cookieStore.delete({ name: 'refresh_token', path: '/' });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete cookies';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
