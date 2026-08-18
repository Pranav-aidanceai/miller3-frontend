import { AxiosError } from 'axios';
import AXIOS from '@/lib/axios';
import { NextResponse } from 'next/server';

// The upstream reports remaining credits on failures too (a rejected query can
// still have consumed one), so forward the header from both branches. Credits
// are unified now — read the canonical header, falling back to the deprecated
// per-operation one in case an older upstream build is still in front of us.
function creditsHeader(headers: unknown): Record<string, string> {
    const h = headers as Record<string, string> | undefined;
    const remaining = h?.['x-credits-remaining'] ?? h?.['x-ai-search-credits-remaining'];
    return remaining == null || remaining === ''
        ? {}
        : { 'x-credits-remaining': String(remaining) };
}

export async function POST(request: Request) {
    try {
        const { query, cursor, limit, operation } = await request.json();
        // Only forward the paging keys when they carry a value so a plain
        // first-page query keeps the upstream defaults. `operation` always goes
        // through — false is a meaningful value there (a new query).
        const response = await AXIOS.post('/api/v1/search/ai', {
            query,
            operation: operation === true,
            ...(cursor ? { cursor } : {}),
            ...(limit ? { limit } : {}),
        });

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
