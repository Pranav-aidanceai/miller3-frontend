import { useCallback, useEffect, useState } from 'react';

/** "45s" under a minute, otherwise "14:59". */
export function formatCooldown(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Lockout after a 429 "too many attempts": holds the backend's message and
 * counts down its Retry-After. Screens show `message` and disable submit while
 * `active`. Counts toward a fixed deadline rather than decrementing per tick,
 * so a backgrounded tab (whose timers browsers throttle) still unlocks on time;
 * the message clears once the wait is over, since it says "try again in N".
 */
export function useRetryCooldown() {
    const [deadline, setDeadline] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [secondsLeft, setSecondsLeft] = useState(0);

    useEffect(() => {
        if (deadline == null) return;
        const tick = () => {
            const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setSecondsLeft(left);
            if (left === 0) {
                setDeadline(null);
                setMessage('');
            }
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [deadline]);

    const start = useCallback((seconds: number, msg: string) => {
        setMessage(msg);
        // Never shorten a lockout that's already running.
        setDeadline(prev => Math.max(prev ?? 0, Date.now() + Math.max(1, seconds) * 1000));
    }, []);

    const active = secondsLeft > 0;
    return {
        active,
        secondsLeft,
        message: active ? message : '',
        label: formatCooldown(secondsLeft),
        start,
    };
}
