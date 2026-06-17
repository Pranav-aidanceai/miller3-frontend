import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const response = await AXIOS.get('/api/v1/admin/search-analytics/top-queries', {
            params: {
                period: searchParams.get('period') ?? undefined,
                query_type: searchParams.get('query_type') ?? undefined,
                limit: searchParams.get('limit') ?? undefined,
                normalize: searchParams.get('normalize') ?? undefined,
            },
        });
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
