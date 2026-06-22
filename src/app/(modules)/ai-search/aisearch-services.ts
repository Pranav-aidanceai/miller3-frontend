import axios from "axios";

/**
 * Normalizes the two error body shapes the AI endpoints return into { detail, code }:
 *   - { error_code, detail }                       (e.g. ACCOUNT_DEACTIVATED)
 *   - { errors: [{ code, message, field }] }        (e.g. INSUFFICIENT_CREDITS)
 */
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

export async function submitQueryAction(query: string) {
    try {
        const response = await axios.post(`/api/search/ai`, { query });
        return {
            data: response.data,
            error: null,
            headers: response.headers["x-ai-search-credits-remaining"]
        }
    } catch (error: unknown) {
        const body = axios.isAxiosError(error) ? error.response?.data : null;
        const { detail, code } = parseAiError(body, 'AI chat failed');
        return { data: null, errors: [{ error: { detail, error_code: code } }] }
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
