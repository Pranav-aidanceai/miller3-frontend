import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    // This route has no dynamic segment, so the bucket comes in as a query
    // param — a `params` argument here would be typed `{}` and fail the build.
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('bucket_id');
    if (!id) {
        return NextResponse.json({ detail: 'bucket_id is required' }, { status: 400 });
    }
    try {
        const response = await AXIOS.get(`/api/v1/buckets/${id}/companies`, {
            params: {
                bucket_id: id,
                limit: searchParams.get('limit') ?? undefined,
                cursor: searchParams.get('cursor') ?? undefined,
                sort_by: searchParams.get('sort_by') ?? undefined,
                sort_order: searchParams.get('sort_order') ?? undefined,
                q: searchParams.get('q') ?? undefined,
            }
        });
        return NextResponse.json(response.data, { status: response.status || 200 });
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Fetch company data failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { bucket_id, ...body } = await request.json();
        const response = await AXIOS.post(`/api/v1/buckets/${bucket_id}/companies`, body);
        return NextResponse.json(response.data, {
            status: response.status || 200
        });
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Company Addition failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { bucket_id, ...body } = await request.json();
        await AXIOS.delete(`/api/v1/buckets/${bucket_id}/companies`, { data: body });
        // The backend answers 204 — a bodiless status, so never attach JSON here.
        return new NextResponse(null, { status: 204 });
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Company deletion failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}