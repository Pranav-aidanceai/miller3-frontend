import { cookies } from "next/headers";
import axios from "axios";

// Server-only axios instance — used inside Next.js Route Handlers (the BFF
// layer) to call the real backend. Never import this from a client
// component; it reads cookies via next/headers, which only exists on the
// server. For browser-side calls (hitting this app's own /api/** routes)
// use src/lib/api/client.ts instead.

const API_URL = process.env.API_BASE_URL;

const AXIOS = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

AXIOS.interceptors.request.use(async (config) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Refreshes the access token using the `refresh_token` cookie. Kept as a
 * private helper here (not its own /api/auth/** route, and not exported)
 * rather than the shared route-handler pattern the rest of auth now
 * follows: this is called *from inside* this instance's own response
 * interceptor to silently retry a failed request, purely server-to-server
 * plumbing that no client component ever calls directly. Moving it to a
 * route would mean this interceptor making an HTTP call back to this same
 * app to reach it — fragile (needs its own origin, no request context to
 * read that from here) for no real benefit. It's deliberately on a raw,
 * standalone axios call rather than the shared `AXIOS` instance: routing
 * the refresh call through the same instance would mean the refresh
 * call's own failures re-enter this interceptor, risking a recursive-retry
 * loop if the refresh endpoint itself ever 401s.
 */
async function refreshAccessToken(): Promise<{ data?: string; errors?: { message: string }[] }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("refresh_token")?.value;
    const response = await axios.post(
      `${API_URL}/api/v1/auth/token/refresh`,
      { refresh_token: token },
      { headers: { "Content-Type": "application/json" } }
    );
    const { access_token } = response.data;
    cookieStore.set("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return { data: access_token };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { errors: error.response?.data?.errors ?? [{ message: "Token generation failed" }] };
    }
    return { errors: [{ message: "Something went wrong" }] };
  }
}

AXIOS.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // A role change invalidates the token's claims, not the session's lifetime:
    // refreshing would either fail or hand back a token whose tier no longer
    // matches the role cached on the client. Skip the retry and let the 401 +
    // ROLE_CHANGED body reach the browser, where the client interceptor
    // (src/lib/api/client.ts) forces a re-login.
    const errorCode = (error.response?.data as { error_code?: string } | undefined)?.error_code;
    if (error.response?.status === 401 && errorCode === "ROLE_CHANGED") {
      throw error;
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const response = await refreshAccessToken();
        // This instance runs server-side (the request interceptor reads cookies
        // via next/headers), so `window` does not exist here. On a failed refresh
        // just reject and let the client redirect to login.
        if (response.errors) {
          return Promise.reject(response.errors);
        }
        return AXIOS(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
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
