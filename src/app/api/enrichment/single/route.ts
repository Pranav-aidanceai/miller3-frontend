import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const response = await AXIOS.post('/api/v1/enrichment/single', payload);

        return NextResponse.json(response.data, {
            status: response.status || 200,
            headers: {
                'x-enrichment-credits-remaining': String(
                    response.headers['x-enrichment-credits-remaining'] ?? ''
                ),
            },
        });
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Enrichment failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}
