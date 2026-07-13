import axios, { AxiosInstance, AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const TOKEN_KEY = "nova_access_token";
export const REFRESH_KEY = "nova_refresh_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
  window.localStorage.setItem(TOKEN_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "حدث خطأ غير متوقع",
): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { error?: unknown; message?: unknown }
      | undefined;
    const candidate = payload?.error ?? payload?.message;

    if (Array.isArray(candidate)) {
      return candidate.map((item) => String(item)).join("، ");
    }
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function getApiStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export const api: AxiosInstance = axios.create({ baseURL: API_URL });

// إرفاق التوكن تلقائيًا
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// تجديد الجلسة عند 401.
// نشارك وعدًا واحدًا للتجديد بين كل الطلبات المتزامنة (بدل رفضها)
// ونضمن إعادة المحاولة مرة واحدة فقط (_retry) لمنع حلقة تجديد لا تنتهي.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken =
    typeof window !== "undefined"
      ? window.localStorage.getItem(REFRESH_KEY)
      : null;
  if (!refreshToken) throw new Error("no refresh token");
  const r = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
  setTokens(r.data.accessToken, r.data.refreshToken);
  return r.data.accessToken as string;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (NonNullable<AxiosError["config"]> & { _retry?: boolean })
      | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        // أول طلب يبدأ التجديد؛ الباقي ينتظر نفس الوعد.
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newAccess = await refreshPromise;
        refreshPromise = null;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        refreshPromise = null;
        clearTokens();
        if (typeof window !== "undefined") window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
