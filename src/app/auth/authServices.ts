'use server'

import AXIOS from "@/lib/axios";
import axios from "axios"
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL

export async function loginAction(email: string, password: string) {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/v1/auth/login`,
            { email, password },
            { headers: { "Content-Type": "application/json" } }
        );

        const { access_token, refresh_token, role, user_details, role_details, credits_left } = response.data?.data

        const cookieStore = await cookies()
        cookieStore.set('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        })
        cookieStore.set('refresh_token', refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 // 7 days
        })

        return { data: { role, user_details, role_details, credits_left }, error: null }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: error.response?.data?.errors ?? [{ message: 'Login failed' }]
            }
        }
        return { data: null, errors: [{ message: 'Something went wrong' }] }
    }
}

export async function refreshTokenAction() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('refresh_token')?.value;
        const response = await axios.post(
            `${API_BASE_URL}/api/v1/auth/token/refresh`,
            { refresh_token: token },
            { headers: { "Content-Type": "application/json" } }
        );
        const { access_token } = response.data
        cookieStore.set('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        })

        return { data: access_token, error: null }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: error.response?.data?.errors ?? [{ message: 'Token generation failed' }]
            }
        }
        return { data: null, errors: [{ message: 'Something went wrong' }] }
    }
}

export async function registerAction(name: string, email: string, password: string, confirmPassword: string, role: string) {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/v1/auth/register`, {
            full_name: name,
            email: email,
            password: password,
            confirm_password: confirmPassword,
            user_tier_requested: role
        },
            { headers: { "Content-Type": "application/json" } }
        );
        return { data: response.data?.data, error: null }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: error.response?.data?.errors ?? [{ message: 'Login failed' }]
            }
        }
        return { data: null, errors: [{ message: 'Something went wrong' }] }
    }
}

export async function logoutAction() {
    try {
        const cookieStore = await cookies()
        const response = await AXIOS.post('/api/v1/auth/logout', {}, {
            headers: {
                "Authorization": `Bearer ${cookieStore.get('access_token')?.value}`
            }
        })
        if(response.status === 200) {
            cookieStore.delete('access_token')
            cookieStore.delete('refresh_token')
        }
        return { data: true, error: null }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: error.response?.data?.errors ?? [{ message: 'Logout failed' }]
            }
        }
        return { data: null, errors: [{ message: 'Something went wrong' }] }
    }
}

export async function resetPasswordAction(email: string) {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/v1/auth/reset-password`, { email },
            { headers: { "Content-Type": "application/json" } }
        );
        return { data: response.data?.data, error: null }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: error.response?.data?.errors ?? [{ message: 'Password reset failed' }]
            }
        }
        return { data: null, errors: [{ message: 'Something went wrong' }] }
    }
}

export async function onboardingAction() {
    try {
        const cookieStore = await cookies()
        const response = await AXIOS.patch(
            `${API_BASE_URL}/api/v1/auth/onboarding/complete`,
            {},
            {
                headers: {
                    "Authorization": `Bearer ${cookieStore.get('access_token')?.value}`
                }
            }
        );
        return { data: response.data?.data, error: null }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            return {
                data: null,
                errors: error.response?.data?.errors ?? [{ message: 'onboarding failed' }]
            }
        }
        return { data: null, errors: [{ message: 'Something went wrong' }] }
    }
}