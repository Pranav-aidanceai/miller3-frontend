import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

// The upstream reports remaining credits on failures too (a rejected query can
// still have consumed one), so forward the header from both branches.
function creditsHeader(headers: unknown): Record<string, string> {
    const remaining = (headers as Record<string, string> | undefined)?.[
        'x-ai-search-credits-remaining'
    ];
    return remaining == null || remaining === ''
        ? {}
        : { 'x-ai-search-credits-remaining': String(remaining) };
}

export async function POST(request: Request) {
    try {
        const { query } = await request.json();
        const response = await AXIOS.post('/api/v1/search/ai', { query });

        return NextResponse.json(response.data, {
            status: response.status || 200,
            headers: creditsHeader(response.headers),
        });
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            return NextResponse.json(
                error.response?.data ?? { detail: 'AI search failed' },
                {
                    status: error.response?.status || 500,
                    headers: creditsHeader(error.response?.headers),
                }
            );
        }
        return NextResponse.json({ detail: 'Something went wrong' }, { status: 500 });
    }
}
