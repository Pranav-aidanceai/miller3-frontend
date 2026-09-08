'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api/client';
import { useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import {
    setSessionExpiryHandler,
    resetSessionExpiring,
    clearSearchState,
    type SessionEndReason,
} from '@/lib/session';
import { SessionEndedNotice } from '@/components/session/SessionEndedNotice';

const LOGOUT_DELAY_SECONDS = Number(process.env.NEXT_PUBLIC_LOGOUT_DELAY_SECONDS) || 5;

/**
 * Renders the forced sign-out overlay and owns the actual teardown
 * (clearing storage/Redux, redirecting to `/`) once one fires. The
 * session-expiry *detection* itself — watching every API response for a
 * 403 or a 401+ROLE_CHANGED — lives in src/lib/api/client.ts's own
 * response interceptor, registered once at module scope rather than tied
 * to this component's mount lifecycle.
 */
export function SessionGuard() {
    const dispatch = useAppDispatch();
    const [reason, setReason] = useState<SessionEndReason | null>(null);
    const tornDownRef = useRef(false);

    useEffect(() => {
        setSessionExpiryHandler((endReason) => setReason(endReason));
        return () => setSessionExpiryHandler(null);
    }, []);

    const teardown = useCallback(async () => {
        if (tornDownRef.current) return;
        tornDownRef.current = true;
        try { await apiClient.post('/delete-cookie'); } catch {}
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

    return <SessionEndedNotice reason={reason} variant="modal" />;
}
