import AXIOS from '@/lib/axios';
import { AxiosError } from 'axios';
import { NextResponse } from 'next/server';
const API_URL = process.env.API_BASE_URL;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const params: Record<string, string> = {};
        const company_id = searchParams.get('companyId');
        const limit = searchParams.get('limit');
        if (limit) params.limit = limit;
        const response = await AXIOS.get(`${API_URL}/api/v1/companies/${company_id}/similar/map`, { params });
        return NextResponse.json({
            data: response.data
        }, {
            status: response.status || 200
        })

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