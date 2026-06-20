import axios from "axios";

export async function submitQueryAction(query: string) {
    try {
        const response = await axios.post(`/api/search/ai`, { query });
        return {
            data: response.data,
            error: null,
            headers: response.headers["x-ai-search-credits-remaining"]
        }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: [{ error: error.response?.data ?? { detail: 'AI chat failed' } }]
            }
        }
        return { data: null, errors: [{ error: { detail: 'Something went wrong' } }] }
    }
}

export async function getTemplateAction() {
    try {
        const response = await axios.get(`/api/search/ai/templates`);
        return { data: response.data, error: null }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            const data = error.response?.data;
            const message = (data && typeof data === 'object' && 'detail' in data)
                ? String((data as { detail: unknown }).detail)
                : 'Templates fetch failed';
            return { data: null, errors: [{ message }] }
        }
        return { data: null, errors: [{ message: 'Something went wrong' }] }
    }
}
