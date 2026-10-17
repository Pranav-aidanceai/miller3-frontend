// Client-side auth "service" functions — thin wrappers over apiClient calls
// to this app's own /api/auth/** route handlers (the BFF layer), which are
// what actually talk to the real backend. Mirrors the same convention as
// src/app/(modules)/search/searchServices.ts: plain functions (not Next.js
// Server Actions — the `Action` suffix is this codebase's naming
// convention for this pattern, not a literal `'use server'` marker),
// normalizing the response into the `{ data, errors }` shape the calling
// components already expect.
//
// The actual backend calls used to live here directly (bypassing this
// app's own API layer) — moved into src/app/api/auth/**/route.ts so auth
// follows the same BFF pattern as every other feature.

import apiClient from '@/lib/api/client';
import axios from 'axios';
import { parseRetryAfter } from '@/lib/rateLimit';

/**
 * The failure half of every action's result. `status` and `retryAfter` let
 * the screens tell a 429 "too many attempts" (show errors[0].message, disable
 * submit for `retryAfter` seconds) apart from an ordinary rejection.
 */
function failure(error: unknown, fallbackMessage: string) {
    if (axios.isAxiosError(error)) {
        return {
            data: null,
            errors: error.response?.data?.errors ?? [{ message: fallbackMessage }],
            status: error.response?.status,
            retryAfter: parseRetryAfter(error.response?.headers?.['retry-after']),
        };
    }
    return { data: null, errors: [{ message: 'Something went wrong' }], status: undefined, retryAfter: null };
}

export async function loginAction(email: string, password: string) {
    try {
        const response = await apiClient.post('/auth/login', { email, password });
        return { data: response.data?.data, errors: null, status: response.status, retryAfter: null };
    } catch (error) {
        return failure(error, 'Login failed');
    }
}

export async function registerAction(name: string, email: string, password: string, confirmPassword: string, role: string, tou: boolean) {
    try {
        const response = await apiClient.post('/auth/register', {
            name,
            email,
            password,
            confirmPassword,
            role,
            tou,
        });
        return { data: response.data?.data, errors: null, status: response.status, retryAfter: null };
    } catch (error) {
        return failure(error, 'Registration failed');
    }
}

export async function resetPasswordAction(email: string) {
    try {
        const response = await apiClient.post('/auth/reset-password', { email });
        return { data: response.data?.data, errors: null, status: response.status, retryAfter: null };
    } catch (error) {
        return failure(error, 'Password reset failed');
    }
}

export async function onboardingAction() {
    try {
        const response = await apiClient.patch('/auth/onboarding', {});
        return { data: response.data?.data, errors: null, status: response.status, retryAfter: null };
    } catch (error) {
        return failure(error, 'Onboarding failed');
    }
}
