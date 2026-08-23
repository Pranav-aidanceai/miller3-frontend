'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ShieldAlert, UserCog } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { getApiError } from '@/lib/apiError';
import {
    setSessionExpiryHandler,
    triggerSessionExpired,
    resetSessionExpiring,
    clearSearchState,
    type SessionEndReason,
} from '@/lib/session';

const LOGOUT_DELAY_SECONDS = Number(process.env.NEXT_PUBLIC_LOGOUT_DELAY_SECONDS) || 5;

const REASON_COPY: Record<SessionEndReason, { title: string; body: string; icon: typeof ShieldAlert }> = {
    deactivated: {
        title: "You're being logged out",
        body: "Your account has been deactivated and you'll be signed out shortly. Please contact your admin for more information.",
        icon: ShieldAlert,
    },
    'role-changed': {
        title: 'Your account tier has changed',
        body: 'Your account tier has been changed. Redirecting you to the login page. For more information, please contact your admin.',
        icon: UserCog,
    },
};

/**
 * The export call uses `responseType: 'blob'`, so its error body arrives as a
 * Blob rather than parsed JSON. Reading a Blob doesn't consume it, so the
 * caller's own handler can still read the body afterwards.
 */
async function readErrorBody(data: unknown): Promise<unknown> {
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
        try {
            return JSON.parse(await data.text());
        } catch {
            return null;
        }
    }
    return data;
}

export function SessionGuard() {
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth.user);
    const [reason, setReason] = useState<SessionEndReason | null>(null);
    const loggedInRef = useRef(!!user);
    const tornDownRef = useRef(false);

    useEffect(() => {
        loggedInRef.current = !!user;
    }, [user]);

    useEffect(() => {
        setSessionExpiryHandler((endReason) => setReason(endReason));
        return () => setSessionExpiryHandler(null);
    }, []);

    useEffect(() => {
        const interceptorId = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const status = error?.response?.status;
                const url: string = error?.config?.url ?? '';
                const isSessionEndpoint =
                    url.includes('/api/auth/') || url.includes('/api/delete-cookie');

                if (!isSessionEndpoint && loggedInRef.current) {
                    if (status === 403) {
                        triggerSessionExpired('deactivated');
                    } else if (status === 401) {
                        // Only a role change forces a re-login here; an ordinary
                        // expired token is retried server-side by the refresh
                        // interceptor in lib/axios.
                        const body = await readErrorBody(error.response?.data);
                        if (getApiError(body, '').code === 'ROLE_CHANGED') {
                            triggerSessionExpired('role-changed');
                        }
                    }
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptorId);
    }, []);

    const teardown = useCallback(async () => {
        if (tornDownRef.current) return;
        tornDownRef.current = true;
        try { await axios.post('/api/delete-cookie'); } catch {}
        try { localStorage.clear(); } catch {}
        clearSearchState();
        dispatch(logout());
        resetSessionExpiring();
        window.location.replace('/');
    }, [dispatch]);

    useEffect(() => {
        if (!reason) return;
        const timer = setTimeout(teardown, LOGOUT_DELAY_SECONDS * 1000);
        return () => clearTimeout(timer);
    }, [reason, teardown]);

    if (!reason) return null;

    const copy = REASON_COPY[reason];
    const Icon = copy.icon;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-background p-6 shadow-2xl">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                        <Icon className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">{copy.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
