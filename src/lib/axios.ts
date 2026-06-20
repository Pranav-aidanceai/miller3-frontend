import { refreshTokenAction } from "@/app/auth/authServices";
import { cookies } from "next/headers";
import axios from "axios";

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

AXIOS.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const response = await refreshTokenAction();
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