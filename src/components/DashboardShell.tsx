"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

interface DashboardShellContextValue {
  openNavigation: () => void;
  closeNavigation: () => void;
}

const DashboardShellContext = createContext<DashboardShellContextValue | null>(
  null,
);

export function useDashboardShell(): DashboardShellContextValue {
  const value = useContext(DashboardShellContext);
  return (
    value ?? {
      openNavigation: () => undefined,
      closeNavigation: () => undefined,
    }
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const openNavigation = useCallback(() => setMobileOpen(true), []);
  const closeNavigation = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const contextValue = useMemo(
    () => ({ openNavigation, closeNavigation }),
    [closeNavigation, openNavigation],
  );

  return (
    <DashboardShellContext.Provider value={contextValue}>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
        <Sidebar />

        {mobileOpen ? (
          <div
            className="fixed inset-0 z-50 md:hidden"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              aria-label="إغلاق قائمة التنقل"
              onClick={closeNavigation}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 right-0 w-[86vw] max-w-80 shadow-2xl">
              <Sidebar
                mobile
                onNavigate={closeNavigation}
                onClose={closeNavigation}
              />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 md:pr-72">
          <div className="min-h-screen">{children}</div>
        </main>
      </div>
    </DashboardShellContext.Provider>
  );
}
