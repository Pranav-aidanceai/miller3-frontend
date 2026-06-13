'use server'

import AXIOS from "@/lib/axios";
import axios from "axios";
import { cookies } from "next/headers";

export async function submitQueryAction(query: string) {
     try {
        const cookieStore = await cookies();
        const token = cookieStore.get('access_token')?.value;
        
        if (!token) {
            return { data: null, errors: [{ message: 'No authentication token found' }] };
        }

        const response = await AXIOS.post(`/api/v1/search/ai`, { query }, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return { data: response.data, error: null, headers: response.headers["x-ai-search-credits-remaining"] }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: error.response?.data ?? [{ message: 'AI chat failed' }]
            }
        }
        return { data: null, errors: [{ error: error, message: 'Something went wrong' }] }
    }
}

export async function getTemplateAction() {
    try {
        const cookieStore = await cookies();
        const response = await AXIOS.get(`/api/v1/search/ai/templates`, {
            headers: {
                "Authorization": `Bearer ${cookieStore.get('access_token')?.value}`
            }
        });
        return { data: response.data, error: null }
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: error.response?.data ?? [{ message: 'Templates fetch failed' }]
            }
        }
        return { data: null, errors: [{ error: error, message: 'Something went wrong' }] }
    }
}