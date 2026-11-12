import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// One shared axios instance. Calls like api.get("/clients/") go to `${VITE_API_BASE}/clients/`.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  withCredentials: true,
});

// Attach the JWT access token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Access tokens expire after a few minutes. On a 401, swap the refresh token for a new
// access token once and retry; if that fails, the session is over: back to login.
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const refresh = localStorage.getItem("refresh");
    const isAuthCall = original?.url?.includes("/auth/");
    if (error.response?.status !== 401 || !original || original._retried || isAuthCall || !refresh) {
      if (error.response?.status === 401 && !isAuthCall) endSession();
      return Promise.reject(error);
    }
    original._retried = true;
    try {
      refreshing ??= api
        .post("/auth/refresh/", { refresh })
        .then((r) => {
          localStorage.setItem("access", r.data.access);
          return r.data.access as string;
        })
        .finally(() => { refreshing = null; });
      const token = await refreshing;
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch (e) {
      endSession();
      return Promise.reject(e);
    }
  }
);

function endSession() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  const login = `${import.meta.env.BASE_URL}login`;
  if (!window.location.pathname.endsWith("/login")) window.location.assign(login);
}

export default api;
