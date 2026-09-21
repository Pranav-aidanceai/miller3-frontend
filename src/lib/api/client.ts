import axios from "axios";
import { getApiError } from "@/lib/apiError";
import { isSessionExpiring, triggerSessionExpired } from "@/lib/session";

// Browser-side axios instance — the counterpart to src/lib/api/server.ts.
// Client components call this app's own /api/** route handlers (the BFF
// layer) through this instance rather than a bare `axios` import, so the
// session-expiry interceptor below covers every client-side API call by
// construction, not by each caller opting in.
const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * The export call uses `responseType: 'blob'`, so its error body arrives as a
 * Blob rather than parsed JSON. Reading a Blob doesn't consume it, so the
 * caller's own handler can still read the body afterwards.
 */
async function readErrorBody(data: unknown): Promise<unknown> {
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    try {
      return JSON.parse(await data.text());
    } catch {
      return null;
    }
  }
  return data;
}

// Registered once at module scope (not tied to a component's mount/unmount
// lifecycle) so it genuinely covers every request made through this
// instance, from the moment the module is first imported.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? "";
    const isSessionEndpoint = url.includes("/auth/") || url.includes("/delete-cookie");
    // Read live Redux state at call time (not a React ref captured at mount,
    // so this fires correctly regardless of which component last
    // mounted/unmounted) — a 403/401 on the public login page itself, before
    // any user is signed in, should never trigger a "you're being logged
    // out" modal. Imported lazily/dynamically rather than at module scope:
    // this file is imported by many components that have nothing to do with
    // Redux, and eagerly instantiating the real store (redux-persist +
    // localStorage) on every one of their test files, whether or not a
    // request ever actually fails, is unnecessary and — inside Jest's jsdom
    // environment specifically — errors outright.
    const { store } = await import("@/store/store");
    const loggedIn = !!store.getState().auth.user;

    if (!isSessionEndpoint && loggedIn && !isSessionExpiring()) {
      if (status === 403) {
        triggerSessionExpired("deactivated");
      } else if (status === 401) {
        // Only a role change forces a re-login here; an ordinary expired
        // token is retried server-side by the refresh interceptor in
        // src/lib/api/server.ts.
        const body = await readErrorBody(error.response?.data);
        if (getApiError(body, "").code === "ROLE_CHANGED") {
          triggerSessionExpired("role-changed");
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
