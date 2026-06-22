import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        const params = new URLSearchParams();
        Object.entries(payload).forEach(([key, value]) => {
            if (value !== null && value !== '' && value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, String(v)));
                } else {
                    params.append(key, String(value));
                }
            }
        });

        const response = await AXIOS.get('/api/v1/search', { params });
        return NextResponse.json(response.data, { status: response.status || 200 });
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Fetch companies failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}
