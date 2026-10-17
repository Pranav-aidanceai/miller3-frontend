import { AxiosError } from 'axios';
import AXIOS from '@/lib/api/server';
import { NextResponse } from 'next/server';

// REST polling fallback for batch progress, used by BatchEnrichToast when the
// progress WebSocket can't be (re)established. The backend computes counts live,
// so `processed` always equals succeeded + failed + duplicate_count.
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ batchId: string }> }
) {
    try {
        const { batchId } = await params;
        const response = await AXIOS.get(
            `/api/v1/batch-enrichment/${encodeURIComponent(batchId)}/status`
        );
        return NextResponse.json({ data: response.data }, { status: response.status || 200 });
    } catch (error: unknown) {
        console.error('Error fetching batch status:', error instanceof Error ? error.message : error);
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Could not fetch batch progress' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}
