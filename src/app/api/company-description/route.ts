import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        // Static route, so the company comes in as a query param, not a path segment.
        const company_id = new URL(request.url).searchParams.get('company_id');
        if (!company_id) {
            return NextResponse.json({ detail: 'company_id is required' }, { status: 400 });
        }
        const response = await AXIOS.get(`/api/v1/companies/${company_id}/description`);
        return NextResponse.json(response.data, { status: response.status || 200 });
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Fetch company description failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const response = await AXIOS.post(`/api/v1/companies/${payload.company_id}/description`, {}, {
            params: {
                company_id: payload.company_id,
                regenerate: !!payload.regenerate,
            },
        });

        return NextResponse.json(response.data, {
            status: response.status || 200,
            // headers: {
            //     'x-enrichment-credits-remaining': String(
            //         response.headers['x-enrichment-credits-remaining'] ?? ''
            //     ),
            // },
        });
    } catch (error: unknown) {
        console.error(
            'Error generating company description:',
            error instanceof AxiosError ? error.response?.data ?? error.message : error
        );
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Company description generation failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}
