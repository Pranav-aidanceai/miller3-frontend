import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const response = await AXIOS.post(`/api/v1/admin/add_company_record`, payload);
        return NextResponse.json(response.data, {
            status: response.status || 200
        });
    } catch (error: unknown) {
        console.error(
            'Error adding company:',
            error instanceof AxiosError ? error.response?.data ?? error.message : error
        );
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Company addition request failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const payload = await request.json();
        const response = await AXIOS.put(`/api/v1/admin/update_company_record`, payload);
        return NextResponse.json(response.data, {
            status: response.status || 200
        });
    } catch (error: unknown) {
        console.error(
            'Error updating company:',
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