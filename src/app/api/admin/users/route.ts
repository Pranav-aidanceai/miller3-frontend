import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const params: Record<string, string> = {};
        const page = searchParams.get('page');
        const limit = searchParams.get('limit');
        const role = searchParams.get('role');
        const username = searchParams.get('username');
        if (page) params.page = page;
        if (limit) params.limit = limit;
        if (role) params.role = role;
        if (username) params.username = username;
        const response = await AXIOS.get('/api/v1/admin/users', { params });
        return NextResponse.json({ data: response.data }, { status: 200 });
    } catch (error: unknown) {
        console.log("error", error)
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