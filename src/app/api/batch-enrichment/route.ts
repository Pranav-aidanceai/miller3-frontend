import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        const response = await AXIOS.post(
            '/api/v1/batch-enrichment/submit',
            payload
        );

        // The backend returns a relative ws_url (e.g. /api/v1/batch-enrichment/{id}/ws).
        // API_BASE_URL is server-only, so resolve it to an absolute ws(s):// URL here
        // (http -> ws, https -> wss) that the browser can open directly.
        const data = response.data ?? {};
        const relativeWs: string | undefined = data.ws_url;
        if (relativeWs && /^\//.test(relativeWs)) {
            const wsBase = (process.env.API_BASE_URL ?? '')
                .replace(/\/+$/, '')
                .replace(/^http/i, 'ws');
            data.ws_url = `${wsBase}${relativeWs}`;
        }

        return NextResponse.json(
            { data },
            { status: response.status || 200 }
        );
    } catch (error: unknown) {
        console.error('error', error);
        if (error instanceof AxiosError) {
            let errorData = error?.response?.data;
            if (typeof errorData === 'object') {
                errorData = JSON.stringify(errorData);
            }
            return NextResponse.json(
                { error: errorData || 'An error occurred' },
                {
                    status: error.response?.status || 500,
                }
            );
        } else if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                {
                    status: 500,
                }
            );
        } else {
            return NextResponse.json(
                { error: error },
                {
                    status: 500,
                }
            );
        }
    }
}
