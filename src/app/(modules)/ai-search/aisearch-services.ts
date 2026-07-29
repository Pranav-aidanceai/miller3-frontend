import axios from "axios";

function parseAiError(body: unknown, fallback: string): { detail: string; code: string | null } {
    if (body && typeof body === 'object') {
        const b = body as {
            error_code?: string;
            detail?: unknown;
            errors?: Array<{ code?: string; message?: string }>;
        };
        if (Array.isArray(b.errors) && b.errors[0]) {
            return { detail: b.errors[0].message ?? fallback, code: b.errors[0].code ?? null };
        }
        if (typeof b.detail === 'string') {
            return { detail: b.detail, code: b.error_code ?? null };
        }
    }
    return { detail: fallback, code: null };
}

// Returns null when the response carried no credit count, so callers can tell
// "no update" apart from "zero credits left".
function parseCreditsRemaining(headers: unknown): number | null {
    const raw = (headers as Record<string, string> | undefined)?.[
        'x-ai-search-credits-remaining'
    ];
    if (raw == null || raw === '') return null;
    const remaining = Number(raw);
    return Number.isFinite(remaining) ? remaining : null;
}

export async function submitQueryAction(query: string) {
    try {
        const response = await axios.post(`/api/search/ai`, { query });
        return {
            data: response.data,
            error: null,
            headers: parseCreditsRemaining(response.headers)
        }
    } catch (error: unknown) {
        const body = axios.isAxiosError(error) ? error.response?.data : null;
        const headers = axios.isAxiosError(error) ? error.response?.headers : null;
        const { detail, code } = parseAiError(body, 'AI chat failed');
        return { data: null, errors: [{ error: { detail, error_code: code } }], headers: parseCreditsRemaining(headers) }
    }
}

export async function getTemplateAction() {
    try {
        const response = await axios.get(`/api/search/ai/templates`);
        return { data: response.data, error: null }
    } catch (error: unknown) {
        const body = axios.isAxiosError(error) ? error.response?.data : null;
        const { detail, code } = parseAiError(body, 'Failed to load templates');
        return { data: null, errors: [{ message: detail, code }] }
    }
}
