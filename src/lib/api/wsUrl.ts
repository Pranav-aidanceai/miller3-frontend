// Server-only: API_BASE_URL is not exposed to the browser.

/**
 * Resolve a backend-relative WebSocket path (e.g.
 * `/api/v1/batch-enrichment/{id}/ws?ticket=…`) to an absolute ws(s):// URL the
 * browser can open directly (http -> ws, https -> wss). Anything that isn't a
 * root-relative path is returned unchanged.
 */
export function toAbsoluteWsUrl(relative: string): string {
    if (!relative.startsWith('/')) return relative;
    const wsBase = (process.env.API_BASE_URL ?? '')
        .replace(/\/+$/, '')
        .replace(/^http/i, 'ws');
    return `${wsBase}${relative}`;
}
