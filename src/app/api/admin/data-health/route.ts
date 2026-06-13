import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await AXIOS.get('/api/v1/admin/data-health');
        return NextResponse.json({ data: response.data }, { status: 200 });
    } catch (error: unknown) {
        console.error("error", error)
        if (error instanceof AxiosError) {
            let errorData = error?.response?.data;
            if (typeof errorData === 'object') {
                errorData = JSON.stringify(errorData);
            }
            return NextResponse.json(
                { error: errorData || 'An error occurred' },
                {
                    status: error.response?.status || 500
                });
        } else if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, {
                status: 500
            });
        } else {
            return NextResponse.json({ error: error }, {
                status: 500
            });
        }
    }
}