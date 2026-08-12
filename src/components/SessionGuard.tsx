'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ShieldAlert } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { setSessionExpiryHandler, triggerSessionExpired, resetSessionExpiring, clearSearchState } from '@/lib/session';

const LOGOUT_DELAY_SECONDS = Number(process.env.NEXT_PUBLIC_LOGOUT_DELAY_SECONDS) || 5;

export function SessionGuard() {
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth.user);
    const [expired, setExpired] = useState(false);
    const loggedInRef = useRef(!!user);
    
    useEffect(() => {
        loggedInRef.current = !!user;
    }, [user]);

    useEffect(() => {
        setSessionExpiryHandler(() => setExpired(true));
        return () => setSessionExpiryHandler(null);
    }, []);

    useEffect(() => {
        const interceptorId = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                const status = error?.response?.status;
                const url: string = error?.config?.url ?? '';
                const isSessionEndpoint =
                    url.includes('/api/auth/') || url.includes('/api/delete-cookie');

                if (status === 403 && !isSessionEndpoint && loggedInRef.current) {
                    triggerSessionExpired();
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptorId);
    }, []);

    useEffect(() => {
        if (!expired) return;

        const timer = setTimeout(async () => {
            try { await axios.post('/api/delete-cookie'); } catch {}
            try { localStorage.clear(); } catch {}
            clearSearchState();
            dispatch(logout());
            resetSessionExpiring();
            window.location.replace('/');
        }, LOGOUT_DELAY_SECONDS * 1000);

        return () => clearTimeout(timer);
    }, [expired, dispatch]);

    if (!expired) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-background p-6 shadow-2xl">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">You&apos;re being logged out</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your account has been deactivated and you&apos;ll be signed out shortly.
                            Please contact your admin for more information.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
