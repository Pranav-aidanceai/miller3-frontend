import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await AXIOS.get('/api/v1/search/ai/templates');
        return NextResponse.json(response.data, { status: response.status || 200 });
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Templates fetch failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}
