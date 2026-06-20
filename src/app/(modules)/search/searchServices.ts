import { CompanySearchPayload } from "@/types/search";
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
