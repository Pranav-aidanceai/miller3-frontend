import { AxiosError } from 'axios';
import AXIOS from '@/lib/api/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {

        const response = await AXIOS.get(`/api/v1/tou`);

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

export async function POST(_request: Request) {
    try {
        // Authorization is attached automatically by AXIOS's own request
        // interceptor (reads the access_token cookie) — no need to read the
        // cookie and build the header manually here anymore.
        const response = await AXIOS.post(`/api/v1/auth/tou/accept`, {});

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