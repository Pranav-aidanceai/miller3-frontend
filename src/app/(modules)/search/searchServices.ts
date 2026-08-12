import { AdminCompanyEditPayload, CodeFilterResponse, CompanyDescriptionResponse, CompanySearchPayload, CompanyUpdatePayload, CompanyUpdateResponse, FilterField } from "@/types/search";
import axios from "axios";

export async function searchAction(payload: CompanySearchPayload) {
    try {
        const response = await axios.post(`/api/search`, payload);
        return { data: response.data, error: null }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: error.response?.data ?? [{ message: 'Fetch companies failed' }]
            }
        }
        return { data: null, errors: [{ error: error, message: 'Something went wrong' }] }
    }
}

export async function getCompanyAction(id: string) {
    try {
        const response = await axios.get(`/api/companies/${id}`);
        return { data: response.data, error: null }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return { data: null, error: error.response?.data ?? { detail: 'Fetch company failed' } };
        }
        return { data: null, error: { detail: 'Something went wrong' } };
    }
}

export async function getFilterOptionsAction(
    field: FilterField,
    params: { q: string; cursor?: string | null; limit?: number }
) {
    try {
        const response = await axios.get<CodeFilterResponse>(`/api/${field}-filter`, {
            params: { q: params.q, cursor: params.cursor || undefined, limit: params.limit }
        });
        return { data: response.data, error: null }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                error: error.response?.data ?? { detail: `Fetch ${field} options failed` }
            };
        }
        return { data: null, error: { detail: 'Something went wrong' } };
    }
}

export interface FilterOption {
    /** The value sent to the search API. */
    code: string;
    /** Human-readable expansion. Empty for fields whose value is already prose. */
    title: string;
}

/**
 * Flatten a filter response's `results`. The dict shape is `{ code: title }`;
 * the list shape has no separate code, so each value stands in for itself.
 */
export function filterResultsToOptions(results: CodeFilterResponse['results']): FilterOption[] {
    return Array.isArray(results)
        ? results.map(value => ({ code: value, title: '' }))
        : Object.entries(results).map(([code, title]) => ({ code, title }));
}

/** Look up a single value's label, tolerating the list-shaped `results`. */
export function filterTitleOf(results: CodeFilterResponse['results'] | undefined, code: string): string | null {
    if (!results || Array.isArray(results)) return null;
    return results[code] ?? null;
}

export async function getSimilarCompanyAction(payload: { company_id: string, limit: number, cursor: string | null }) {
    try {
        const response = await axios.get(`/api/companies/${payload.company_id}/similar`, {
            params: { limit: payload.limit, cursor: payload.cursor }
        });
        return { data: response.data, error: null }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: error.response?.data ?? [{ message: 'Fetch company failed' }]
            }
        }
        return { data: null, errors: [{ error: error, message: 'Something went wrong' }] }
    }
}

export async function generateCompanyDescriptionAction(payload: { company_id: string; regenerate: boolean }) {
    try {
        const response = await axios.post<CompanyDescriptionResponse>(`/api/company-description`, payload);
        return { data: response.data, error: null }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                error: error.response?.data ?? { detail: 'Description generation failed' }
            };
        }
        return { data: null, error: { detail: 'Something went wrong' } };
    }
}

/** Propose an edit to a company record. The change is queued for admin review. */
export async function requestCompanyUpdateAction(payload: CompanyUpdatePayload) {
    try {
        const response = await axios.post<CompanyUpdateResponse>(`/api/company-update`, payload);
        return { data: response.data, error: null }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                error: error.response?.data ?? { detail: 'Company update request failed' }
            };
        }
        return { data: null, error: { detail: 'Something went wrong' } };
    }
}

/** Admin-only direct edit — applied to the company immediately, no review step. */
export async function updateCompanyRecordAction(payload: AdminCompanyEditPayload) {
    try {
        const response = await axios.put(`/api/admin/company`, payload);
        return { data: response.data ?? {}, error: null }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                error: error.response?.data ?? { detail: 'Company update failed' }
            };
        }
        return { data: null, error: { detail: 'Something went wrong' } };
    }
}

export async function singleEnrichAction(payload: { company_id?: string, company_name: string, location: string }) {
    try {
        const response = await axios.post(`/api/enrichment/single`, payload);
        return {
            data: {
                status: 'SUCCESS',
                data: response.data,
                headers: response.headers["x-enrichment-credits-remaining"]
            },
            error: null
        }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: [{ error: error.response?.data, message: 'Enrichment failed' }]
            }
        }
        return { data: null, errors: [{ error: error, message: 'Something went wrong' }] }
    }
}
