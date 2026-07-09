"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, setTokens, clearTokens, getToken } from "@/lib/api";
import { closeSocket } from "@/lib/socket";

interface AuthState {
  authed: boolean;
  ready: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hasToken = Boolean(getToken());
    setAuthed(hasToken);
    setReady(true);
    if (!hasToken && pathname !== "/login") router.replace("/login");
  }, [pathname, router]);

  async function login(phone: string, password: string): Promise<void> {
    const res = await api.post("/auth/login", { phone, password });
    if (res.data.role !== "STAFF") {
      throw new Error("هذا الحساب ليس لديه صلاحية الدخول للوحة");
    }
    setTokens(res.data.accessToken, res.data.refreshToken);
    setAuthed(true);
    router.replace("/");
  }

  function logout(): void {
    clearTokens();
    closeSocket();
    setAuthed(false);
    router.replace("/login");
  }

  const state: AuthState = { authed, ready, login, logout };

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
