import { AxiosError } from 'axios';
import AXIOS from '@/lib/api/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        const response = await AXIOS.post(
            '/api/v1/batch-enrichment/submit',
            payload
        );

        // The backend's ws_url here carries no credentials and is refused once
        // the backend enforces socket auth. The client connects through a
        // single-use ticket from ./[batchId]/ws-ticket instead, so drop it.
        const { ws_url: _untickedWsUrl, ...data } = response.data ?? {};

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
