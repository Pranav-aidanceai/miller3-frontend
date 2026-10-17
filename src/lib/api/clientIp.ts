import { isIP } from 'node:net';
import { headers } from 'next/headers';

// Server-only. Every backend call is made by this server on the user's behalf,
// so the backend sees the App Service's IP for everyone. Forwarding the
// browser's IP lets it apply its per-IP limits (login floods, credential
// stuffing) to each user separately.

/**
 * The browser's IP from an incoming X-Forwarded-For header, as set by Azure App
 * Service: it appends the real client address as the LAST entry, formatted
 * "ip:port" ("[ipv6]:port" for IPv6). Earlier entries are whatever the browser
 * sent and must not be trusted. Returns one plain IP (no port) or null — the
 * backend ignores values it can't parse as an IP, so anything else would
 * silently switch its per-IP protection off.
 */
export function parseClientIp(xff: string | null | undefined): string | null {
    const last = xff?.split(',').map((s) => s.trim()).filter(Boolean).pop();
    if (!last) return null;

    let candidate = last;
    if (last.startsWith('[')) {
        const end = last.indexOf(']');
        if (end === -1) return null;
        candidate = last.slice(1, end);                        // [ipv6]:port
    } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(last)) {
        candidate = last.slice(0, last.indexOf(':'));          // ipv4:port
    }                                                          // else bare ip

    return isIP(candidate) ? candidate : null;
}

/** The current request's client IP, or null outside a request / when absent. */
export async function clientIp(): Promise<string | null> {
    try {
        return parseClientIp((await headers()).get('x-forwarded-for'));
    } catch {
        // headers() throws outside a request scope.
        return null;
    }
}

/**
 * `{ 'x-forwarded-for': <ip> }` for an outgoing backend call, or `{}` when the
 * IP is unknown (e.g. local dev). Never forwards the incoming header as-is.
 */
export async function forwardedForHeader(): Promise<Record<string, string>> {
    const ip = await clientIp();
    return ip ? { 'x-forwarded-for': ip } : {};
}
