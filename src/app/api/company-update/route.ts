import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const status = new URL(request.url).searchParams.get('status');
        const page = new URL(request.url).searchParams.get('page');
        const limit = new URL(request.url).searchParams.get('limit');
        const response = await AXIOS.get(`/api/v1/companies/company_record_update_requests`, {
            params: {
                status,
                page,
                limit
            },
        });
        return NextResponse.json(response.data, { status: response.status || 200 });
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Fetch company update requests failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const response = await AXIOS.post(`/api/v1/companies/request_company_record_update`, payload);
        return NextResponse.json(response.data, {
            status: response.status || 200
        });
    } catch (error: unknown) {
        console.error(
            'Error generating company description:',
            error instanceof AxiosError ? error.response?.data ?? error.message : error
        );
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Company update request failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}
