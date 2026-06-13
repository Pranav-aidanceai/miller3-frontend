import { refreshTokenAction } from "@/app/auth/authServices";
import { cookies } from "next/headers";
import axios from "axios";
import { cookies } from "next/headers";

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
        if (response.errors) {
          window.location.href = '/';
          return Promise.reject(response.errors);
        }
        return AXIOS(originalRequest);
      } catch (refreshError) {
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    if (error.response) {
      throw error.response.data;
    } else {
      throw new Error("Network Error");
    }
  }
);

export default AXIOS;