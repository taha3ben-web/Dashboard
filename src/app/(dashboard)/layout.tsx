"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { useAuth } from "@/providers/AuthProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authed, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 dark:border-indigo-950 dark:border-t-indigo-400" />
          <div className="text-sm font-semibold">جارٍ تجهيز مركز التحكم...</div>
        </div>
      </div>
    );
  }
  if (!authed) return null;

  return <DashboardShell>{children}</DashboardShell>;
}
