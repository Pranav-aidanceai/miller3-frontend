import { cookies } from "next/headers";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { forwardedForHeader } from "./clientIp";
import { ACCESS_TOKEN_COOKIE, EXPIRED_COOKIE, REFRESH_TOKEN_COOKIE } from "./authCookies";
import { parseRetryAfter } from "@/lib/rateLimit";

// Server-only axios instance — used inside Next.js Route Handlers (the BFF
// layer) to call the real backend. Never import this from a client
// component; it reads cookies via next/headers, which only exists on the
// server. For browser-side calls (hitting this app's own /api/** routes)
// use src/lib/api/client.ts instead.

const API_URL = process.env.API_BASE_URL;

/** Per-request flags this file adds to axios's config. */
type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  /** Access token from a refresh in this request, newer than the cookie. */
  _accessToken?: string;
};

const AXIOS = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

AXIOS.interceptors.request.use(async (config: RetriableConfig) => {
  const cookieStore = await cookies();
  const token = config._accessToken ?? cookieStore.get("access_token")?.value;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // The browser's IP, so the backend's per-IP limits apply per user rather
  // than to this server's single outbound IP. See ./clientIp.ts.
  Object.assign(config.headers, await forwardedForHeader());
  return config;
});

// ── Token refresh ────────────────────────────────────────────────────────────
//
// Kept private to this file rather than its own /api/** route: it is called
// from inside this instance's response interceptor to silently retry a
// request whose access token expired. It uses a raw axios call, not `AXIOS`,
// so a failing refresh can't re-enter the interceptor and loop.
//
// The backend rotates refresh tokens: every refresh returns a NEW refresh
// token and the old one becomes single-use — presenting it a second time is
// treated as theft and ends the session. So:
//   1. the new refresh token must be saved on every refresh, and
//   2. the same old token must never be sent twice. Parallel requests (or
//      tabs) that hit an expired access token together share one refresh,
//      and requests that still carry the old cookie shortly afterwards
//      (sent before the browser received the new one) reuse its result.

type RefreshOutcome =
  | { ok: true; accessToken: string; refreshToken?: string }
  /** `sessionOver`: the backend refused the session (401) — sign out. */
  | { ok: false; sessionOver: boolean; error: unknown };

/**
 * A 429 from /token/refresh means "slow down", not "session over" — it must
 * never log the user out. Short waits (the backend's "server is busy" case)
 * are absorbed here with a single retry; longer ones are passed back to the
 * caller as a 429 rather than holding a request handler open that long.
 */
const MAX_REFRESH_RETRY_WAIT_SECONDS = 5;

/**
 * How long a successful refresh is remembered for its old refresh token, so
 * requests that arrive still carrying that (now single-use) token reuse the
 * result instead of presenting it again. Long enough to cover requests in
 * flight when the new cookie was issued; short, because within it the old
 * token yields the new tokens without reaching the backend.
 */
const REFRESH_REUSE_WINDOW_MS = 20_000;

/**
 * Refreshes in progress or recently completed, keyed by the refresh token
 * they were started with — so one user's result can never be handed to
 * another. Per server instance: with several App Service instances, requests
 * for one user landing on different instances still refresh separately.
 */
const refreshes = new Map<string, Promise<RefreshOutcome>>();

async function postRefresh(refreshToken: string) {
  return axios.post(
    `${API_URL}/api/v1/auth/token/refresh`,
    { refresh_token: refreshToken },
    { headers: { "Content-Type": "application/json", ...(await forwardedForHeader()) } }
  );
}

async function callRefreshEndpoint(refreshToken: string): Promise<RefreshOutcome> {
  try {
    let response;
    try {
      response = await postRefresh(refreshToken);
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 429) throw error;
      const wait = parseRetryAfter(error.response.headers?.["retry-after"]) ?? 1;
      if (wait > MAX_REFRESH_RETRY_WAIT_SECONDS) throw error;
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      response = await postRefresh(refreshToken);
    }

    const { access_token, refresh_token } = response.data ?? {};
    if (typeof access_token !== "string" || !access_token) {
      return { ok: false, sessionOver: false, error: new Error("Token generation failed") };
    }
    return {
      ok: true,
      accessToken: access_token,
      // Absent until the backend ships rotation; then present on every refresh.
      refreshToken: typeof refresh_token === "string" && refresh_token ? refresh_token : undefined,
    };
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    return { ok: false, sessionOver: status === 401, error };
  }
}

/** One refresh per refresh token, shared by everyone presenting it. */
function sharedRefresh(refreshToken: string): Promise<RefreshOutcome> {
  const existing = refreshes.get(refreshToken);
  if (existing) return existing;

  const promise = callRefreshEndpoint(refreshToken);
  refreshes.set(refreshToken, promise);
  void promise.then((outcome) => {
    // Failures are forgotten at once so a later request can try again;
    // successes are kept for the reuse window.
    if (!outcome.ok) {
      refreshes.delete(refreshToken);
      return;
    }
    const timer = setTimeout(() => refreshes.delete(refreshToken), REFRESH_REUSE_WINDOW_MS);
    timer.unref?.();
  });
  return promise;
}

/** Refreshes for the current request and writes the outcome to its cookies. */
async function refreshSession(): Promise<RefreshOutcome> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) {
    return { ok: false, sessionOver: true, error: null };
  }

  const outcome = await sharedRefresh(refreshToken);

  // Cookies set through cookies() are added to whatever response this route
  // returns, so every request that shared the refresh hands the browser the
  // same new tokens.
  if (outcome.ok) {
    cookieStore.set("access_token", outcome.accessToken, ACCESS_TOKEN_COOKIE);
    if (outcome.refreshToken) {
      cookieStore.set("refresh_token", outcome.refreshToken, REFRESH_TOKEN_COOKIE);
    }
  } else if (outcome.sessionOver) {
    cookieStore.set("access_token", "", EXPIRED_COOKIE);
    cookieStore.set("refresh_token", "", EXPIRED_COOKIE);
  }
  return outcome;
}

/**
 * The 401 the browser receives when the session is over (logged out
 * elsewhere, password changed, refresh token expired or reused). The client
 * interceptor (src/lib/api/client.ts) recognises SESSION_EXPIRED and signs the
 * user out.
 */
function sessionExpiredError(original: AxiosError): AxiosError {
  const data = {
    error_code: "SESSION_EXPIRED",
    errors: [{ code: "SESSION_EXPIRED", message: "Your session has ended. Please sign in again." }],
  };
  return new AxiosError(
    "Session expired",
    AxiosError.ERR_BAD_REQUEST,
    original.config,
    original.request,
    {
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: original.config!,
      data,
    }
  );
}

AXIOS.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetriableConfig;

    // A role change invalidates the token's claims, not the session's lifetime:
    // refreshing would either fail or hand back a token whose tier no longer
    // matches the role cached on the client. Skip the retry and let the 401 +
    // ROLE_CHANGED body reach the browser, where the client interceptor
    // (src/lib/api/client.ts) forces a re-login.
    const errorCode = (error.response?.data as { error_code?: string } | undefined)?.error_code;
    if (error.response?.status === 401 && errorCode === "ROLE_CHANGED") {
      throw error;
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const outcome = await refreshSession();
      if (outcome.ok) {
        // Retry with the new token explicitly rather than re-reading the
        // cookie this request arrived with.
        originalRequest._accessToken = outcome.accessToken;
        return AXIOS(originalRequest);
      }
      if (outcome.sessionOver) {
        throw sessionExpiredError(error);
      }
      // Anything else (429 rate limit, 403 deactivated, 5xx) is passed on
      // as-is so the route forwards its real status — never a sign-out.
      throw outcome.error instanceof Error ? outcome.error : new Error("Token refresh failed");
    }

    // Rethrow the original AxiosError so route handlers can read
    // `error.response.status` (e.g. forward a 403 to the client) and
    // `error.response.data`. Throwing the bare `error.response.data` here
    // loses the status code and breaks every `instanceof AxiosError` check.
    if (error.response) {
      throw error;
    } else {
      throw new Error("Network Error");
    }
  }
);

export default AXIOS;
