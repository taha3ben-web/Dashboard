"use client";

import { LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/providers/AuthProvider";

export function Topbar({ title }: { title: string }) {
  const { logout } = useAuth();
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <LogOut size={16} />
          خروج
        </button>
      </div>
    </header>
  );
}
