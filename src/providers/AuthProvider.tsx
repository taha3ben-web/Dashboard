"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  api,
  setTokens,
  clearTokens,
  getToken,
  getApiErrorMessage,
  getApiStatus,
} from "@/lib/api";
import { closeSocket } from "@/lib/socket";
import {
  canAccessPath,
  firstAccessiblePath,
  hasAnyPermission,
  type StaffMe,
} from "@/lib/permissions";

const PROFILE_KEY = "nova_staff_profile";

interface AuthState {
  authed: boolean;
  ready: boolean;
  profile: StaffMe | null;
  permissions: string[];
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  can: (...required: string[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

function readCachedProfile(): StaffMe | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(PROFILE_KEY);
    return value ? (JSON.parse(value) as StaffMe) : null;
  } catch {
    return null;
  }
}

function cacheProfile(profile: StaffMe): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function clearProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<StaffMe | null>(null);
  const verifiedTokenRef = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      verifiedTokenRef.current = null;
      setAuthed(false);
      setProfile(null);
      setReady(true);
      if (pathname !== "/login") router.replace("/login");
      return;
    }

    const cachedProfile = readCachedProfile();
    if (cachedProfile) {
      setProfile(cachedProfile);
      setAuthed(true);
      setReady(true);

      if (pathname === "/login") {
        router.replace(firstAccessiblePath(cachedProfile.permissions));
      } else if (!canAccessPath(pathname, cachedProfile.permissions)) {
        router.replace(firstAccessiblePath(cachedProfile.permissions));
      }
    }

    if (verifiedTokenRef.current === token) return;
    verifiedTokenRef.current = token;

    let active = true;
    api
      .post<StaffMe>("/auth/me")
      .then((response) => {
        if (!active) return;
        const nextProfile = response.data;

        if (nextProfile.role !== "STAFF") {
          clearTokens();
          clearProfile();
          verifiedTokenRef.current = null;
          setProfile(null);
          setAuthed(false);
          router.replace("/login");
          return;
        }

        cacheProfile(nextProfile);
        setProfile(nextProfile);
        setAuthed(true);
        setReady(true);

        if (pathname === "/login") {
          router.replace(firstAccessiblePath(nextProfile.permissions));
        } else if (!canAccessPath(pathname, nextProfile.permissions)) {
          router.replace(firstAccessiblePath(nextProfile.permissions));
        }
      })
      .catch((error: unknown) => {
        if (!active) return;

        if (getApiStatus(error) === 401) {
          clearTokens();
          clearProfile();
          verifiedTokenRef.current = null;
          setProfile(null);
          setAuthed(false);
          router.replace("/login");
          return;
        }

        if (cachedProfile) {
          setProfile(cachedProfile);
          setAuthed(true);
          setReady(true);
          return;
        }

        clearTokens();
        clearProfile();
        verifiedTokenRef.current = null;
        setProfile(null);
        setAuthed(false);
        setReady(true);
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  async function login(phone: string, password: string): Promise<void> {
    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        role: string;
        userId: string;
        permissions: string[];
        user: StaffMe["user"];
        staffRole?: StaffMe["staffRole"];
      }>("/auth/login", { phone, password });

      if (res.data.role !== "STAFF") {
        throw new Error("هذا الحساب ليس لديه صلاحية الدخول للوحة");
      }

      const nextProfile: StaffMe = {
        userId: res.data.userId,
        role: res.data.role,
        permissions: res.data.permissions ?? [],
        user: res.data.user,
        staffRole: res.data.staffRole ?? null,
      };

      setTokens(res.data.accessToken, res.data.refreshToken);
      cacheProfile(nextProfile);
      verifiedTokenRef.current = null;
      setProfile(nextProfile);
      setAuthed(true);
      setReady(true);
      router.replace(firstAccessiblePath(nextProfile.permissions));
    } catch (error) {
      throw new Error(
        getApiErrorMessage(error, "فشل تسجيل الدخول. تحقق من رقم الهاتف وكلمة المرور."),
      );
    }
  }

  function logout(): void {
    void api.post("/auth/logout", {}).catch(() => undefined);
    clearTokens();
    clearProfile();
    closeSocket();
    verifiedTokenRef.current = null;
    setProfile(null);
    setAuthed(false);
    router.replace("/login");
  }

  const permissions = profile?.permissions ?? [];
  const state: AuthState = useMemo(
    () => ({
      authed,
      ready,
      profile,
      permissions,
      login,
      logout,
      can: (...required: string[]) => hasAnyPermission(permissions, required),
    }),
    [authed, ready, profile, permissions],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
