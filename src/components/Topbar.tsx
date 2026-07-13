"use client";

import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/providers/AuthProvider";
import { useDashboardShell } from "@/components/DashboardShell";

export function Topbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { logout, profile } = useAuth();
  const { openNavigation } = useDashboardShell();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/90">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={openNavigation}
            aria-label="فتح قائمة التنقل"
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-100 md:hidden dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl dark:text-white">
              {title}
            </h1>
            <p className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block dark:text-gray-400">
              {subtitle ?? "إدارة ومراقبة عمليات NOVA Ride في الوقت الفعلي"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 lg:flex dark:border-gray-700 dark:bg-gray-800">
            <ShieldCheck size={16} className="text-emerald-500" />
            <div className="leading-tight">
              <div className="max-w-36 truncate text-xs font-bold text-slate-700 dark:text-gray-200">
                {profile?.user.name ?? "موظف NOVA"}
              </div>
              <div className="max-w-36 truncate text-[10px] text-slate-400">
                {profile?.staffRole?.name ?? "بدون دور"}
              </div>
            </div>
          </div>
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            title="تسجيل الخروج"
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <LogOut size={17} />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
}
