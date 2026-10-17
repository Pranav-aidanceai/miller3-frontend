import { AxiosError } from 'axios';
import AXIOS from '@/lib/api/server';
import { NextResponse } from 'next/server';
import { toAbsoluteWsUrl } from '@/lib/api/wsUrl';

// Issues a single-use, 60-second ticket for the batch-progress WebSocket.
// Browsers can't attach an Authorization header to a WebSocket and the access
// token lives in an HttpOnly cookie, so the socket authenticates with
// `?ticket=…` instead. Routed through the shared AXIOS instance, which attaches
// the Bearer token and refreshes it if expired. The backend only issues tickets
// to the batch's owner (or an admin): 403 otherwise, 404 for an unknown batch.
// A ticket works once — the client must call this again before every reconnect.
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ batchId: string }> }
) {
    try {
        const { batchId } = await params;
        const response = await AXIOS.post(
            `/api/v1/batch-enrichment/${encodeURIComponent(batchId)}/ws-ticket`,
            {}
        );

        const { ws_url, expires_in } = response.data ?? {};
        if (typeof ws_url !== 'string' || !ws_url) {
            return NextResponse.json(
                { errors: [{ message: 'No progress channel was returned.' }] },
                { status: 502 }
            );
        }

        // The ticket itself is deliberately not logged anywhere here.
        return NextResponse.json(
            { data: { ws_url: toAbsoluteWsUrl(ws_url), expires_in } },
            { status: 200 }
        );
    } catch (error: unknown) {
        console.error('Error issuing batch ws ticket:', error instanceof Error ? error.message : error);
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'Could not open the progress connection' },
                { status: error.response?.status || 500 }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}
