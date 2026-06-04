'use server'

import AXIOS from "@/lib/axios";
import { CompanySearchPayload } from "@/types/search";
import axios from "axios";
import { cookies } from "next/headers";

export async function searchAction(payload: CompanySearchPayload) {
    try {
        const cookieStore = await cookies();
        const params = new URLSearchParams();

        Object.entries(payload).forEach(([key, value]) => {
            if (value !== null && value !== '' && value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, String(v)));
                } else {
                    params.append(key, String(value));
                }
            }
        });

        const response = await AXIOS.get(`/api/v1/search`, {
            params,
            headers: {
                "Authorization": `Bearer ${cookieStore.get('access_token')?.value}`
            }
        });
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
        const cookieStore = await cookies();
        const response = await AXIOS.get(`/api/v1/companies/${id}`, {
            headers: {
                "Authorization": `Bearer ${cookieStore.get('access_token')?.value}`
            }
        });
        return { data: response.data, error: null }
    } catch (error: unknown) {
        return { data: null, error: error };
    }
}

export async function getSimilarCompanyAction(payload: { company_id: string, limit: number, cursor: string | null }) {
    try {
        const cookieStore = await cookies();
        const params = { limit: payload.limit, cursor: payload.cursor };
        const response = await AXIOS.get(`/api/v1/companies/${payload.company_id}/similar`, {
            params,
            headers: {
                "Authorization": `Bearer ${cookieStore.get('access_token')?.value}`
            }
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

export async function singleEnrichAction(payload: { company_name: string, location: string }) {
    try {
        const cookieStore = await cookies();
        const response = await AXIOS.post(`/api/v1/enrichment/single`, payload, {
            headers: {
                "Authorization": `Bearer ${cookieStore.get('access_token')?.value}`
            }
        });
        return { data: {status: 'SUCCESS', data: response.data, headers: response.headers["x-enrichment-credits-remaining"]}, error: null }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: error.response?.data ?? [{ message: 'Enrichment failed' }]
            }
        }
        return { data: null, errors: [{ error: error, message: 'Something went wrong' }] }
    }
}