import { toast } from 'sonner';
import { X, AlertCircle } from 'lucide-react';

/**
 * Normalizes the various error shapes the search/export/enrich APIs return into a
 * `{ detail, code }` pair. Known shapes:
 *
 *   - `{ error: "{\"error_code\":\"HTTP_402\",\"detail\":\"Monthly export quota reached...\"}" }`
 *     (export — `error` is a JSON string wrapping `{ error_code, detail }`)
 *   - `{ error: { error_code, detail, request_id } }` where `detail` is a Python-style
 *     dict string `{'errors': [{'code': 'INSUFFICIENT_CREDITS', 'message': '...', 'field': None}]}`
 *     (batch enrich)
 *   - plain-text or simple `{ detail }` payloads
 */
export function parseApiError(
    body: unknown,
    fallback: string,
): { detail: string; code: string | null } {
    let detail = fallback;
    let code: string | null = null;

    const raw = (body as { error?: unknown } | null)?.error;
    if (raw == null) return { detail, code };

    // `error` may be a JSON string or an already-parsed object wrapper.
    let wrapper: unknown = raw;
    if (typeof raw === 'string') {
        try { wrapper = JSON.parse(raw); } catch { wrapper = raw; }
    }

    // A bare string with no further structure — use it directly.
    if (typeof wrapper === 'string') {
        return { detail: wrapper || fallback, code };
    }

    if (wrapper && typeof wrapper === 'object') {
        const obj = wrapper as { error_code?: string; detail?: unknown };
        if (typeof obj.error_code === 'string') code = obj.error_code;

        // The real message lives in `detail`, which can be plain text, a JSON string,
        // or a Python-style dict string.
        let inner: unknown = obj.detail ?? obj;
        if (typeof inner === 'string') {
            try { inner = JSON.parse(inner); } catch { /* not JSON — handled below */ }
        }

        if (inner && typeof inner === 'object') {
            const o = inner as { errors?: Array<{ code?: string; message?: string }>; detail?: string };
            const first = Array.isArray(o.errors) ? o.errors[0] : null;
            if (first?.message) {
                detail = first.message;
                code = first.code ?? code;
            } else if (typeof o.detail === 'string') {
                detail = o.detail;
            }
        } else if (typeof inner === 'string') {
            // Plain text (e.g. "Monthly export quota reached...") or a Python-style
            // dict string we couldn't JSON-parse — extract message/code via regex.
            const msgMatch = inner.match(/['"]message['"]\s*:\s*['"]([^'"]+)['"]/);
            const codeMatch = inner.match(/['"]code['"]\s*:\s*['"]([^'"]+)['"]/);
            if (msgMatch) {
                detail = msgMatch[1];
                if (codeMatch) code = codeMatch[1];
            } else {
                detail = inner;
            }
        }
    }

    return { detail, code };
}

/** Whether an error code represents an exhausted credit / quota (HTTP 402). */
export function isCreditError(code: string | null): boolean {
    return code === 'INSUFFICIENT_CREDITS' || code === 'HTTP_402';
}

/**
 * Persistent toast for the out-of-credits case, with a "contact admin" mailto button.
 * Mirrors the styling shared by export and batch enrichment.
 */
export function showCreditLimitToast(opts: {
    detail: string;
    fallbackMessage: string;
    mailtoSubject: string;
}) {
    toast.custom((id) => (
        <div className="relative flex w-full flex-col gap-3 rounded-lg border border-destructive bg-destructive p-4 text-white shadow-lg">
            <button
                type="button"
                aria-label="Close"
                onClick={() => toast.dismiss(id)}
                className="absolute right-2 top-2 rounded p-0.5 text-white/80 transition-colors hover:text-white"
            >
                <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3 pr-5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm font-medium leading-snug">
                    {opts.detail || opts.fallbackMessage}
                </p>
            </div>
            <button
                type="button"
                onClick={() => {
                    window.location.href = `mailto:admin@miller3.com?subject=${encodeURIComponent(opts.mailtoSubject)}`;
                }}
                className="w-fit rounded-md bg-black/30 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/40 cursor-pointer"
            >
                Contact admin for more credits
            </button>
        </div>
    ), { duration: Infinity });
}
