import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await AXIOS.get(`/api/v1/buckets`);
        return NextResponse.json(response.data, { status: response.status || 200 });
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Fetch bucket data failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const response = await AXIOS.post('/api/v1/buckets', payload);
        return NextResponse.json(response.data, {
            status: response.status || 200});
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Bucket creation failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { bucket_id, ...body } = await request.json();
        const response = await AXIOS.patch(`/api/v1/buckets/${bucket_id}`, body);
        return NextResponse.json(response.data, {
            status: response.status || 200});
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Bucket update failed' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const payload = await request.json();
        await AXIOS.delete(`/api/v1/buckets/${payload.bucket_id}`);
        // The backend answers 204 — a bodiless status, so never attach JSON here.
        return new NextResponse(null, { status: 204 });
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Bucket deletion failed' },
                { status: error.response?.status || 500 }
            );
        }   
    return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}