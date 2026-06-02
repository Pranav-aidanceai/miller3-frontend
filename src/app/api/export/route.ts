import axios from 'axios';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import AXIOS from '@/lib/axios';

export async function POST(req: Request) {
    try {
        const payload = await req.json();

        const cookieStore = await cookies();

        const response = await AXIOS.post(
            '/api/v1/export',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${cookieStore.get(
                        'access_token'
                    )?.value}`,
                },
                responseType: 'arraybuffer',
            }
        );

        const headers = new Headers();

        headers.set(
            'Content-Type',
            String(response.headers['content-type'] ?? 'text/csv')
        );

        headers.set(
            'Content-Disposition',
            String(
                response.headers['content-disposition'] ??
                'attachment; filename="export.csv"'
            )
        );

        headers.set(
            'x-export-credits-remaining',
            String(response.headers['x-export-credits-remaining'] ?? '0')
        );

        return new Response(response.data, {
            status: 200,
            headers
        });
        
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return NextResponse.json(
                error.response?.data ?? {
                    message: 'Export failed',
                },
                {
                    status: error.response?.status ?? 500,
                }
            );
        }

        return NextResponse.json(
            { message: (error as Error).message || 'Export failed' },
            { status: 500 }
        );
    }
}