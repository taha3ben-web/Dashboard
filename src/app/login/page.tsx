"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { LogIn, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone.trim(), password);
      // نجاح تسجيل الدخول ينقلنا تلقائيًا إلى الصفحة الرئيسية عبر AuthProvider
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "فشل تسجيل الدخول. تحقق من رقم الهاتف وكلمة المرور.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-950">
      <div className="absolute left-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <LogIn size={22} />
          </div>
          <h1 className="text-2xl font-bold">NOVA Ride</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            تسجيل الدخول إلى لوحة التحكم
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              رقم الهاتف
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="username"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="05xxxxxxxx"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                جارٍ الدخول...
              </>
            ) : (
              "دخول"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
