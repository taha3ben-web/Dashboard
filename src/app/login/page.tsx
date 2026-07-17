"use client";

import { type FormEvent, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getApiErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (loginError) {
      setError(getApiErrorMessage(loginError, "فشل تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.28),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(124,58,237,0.22),transparent_38%)]" />
      <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="absolute left-4 top-4 z-20 rounded-xl border border-white/10 bg-white/10 p-1 backdrop-blur-xl">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-12 lg:grid-cols-2 lg:px-8">
        <section className="hidden text-white lg:block">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-700 text-2xl font-black shadow-2xl shadow-indigo-500/30">
              N
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">NOVA Ride</h1>
              <p className="text-sm text-indigo-200">
                Global Mobility Control Center
              </p>
            </div>
          </div>
          <h2 className="max-w-xl text-4xl font-black leading-tight">
            مركز تشغيل موحّد لاتخاذ قرارات أسرع وأكثر أمانًا.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            راقب الرحلات والمدفوعات والسلامة والموظفين من واجهة واحدة متصلة
            مباشرة بمصدر الحقيقة في الخادم.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            {[
              "صلاحيات دقيقة حسب الدور",
              "دفتر مالي مزدوج القيد",
              "مراقبة تشغيلية لحظية",
              "سجل تدقيق وجلسات آمنة",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur"
              >
                <ShieldCheck size={17} className="text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-[28px] border border-white/10 bg-white p-6 shadow-2xl shadow-black/30 sm:p-8 dark:bg-gray-900">
            <div className="mb-7">
              <div className="mb-5 flex items-center justify-between lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 font-black text-white">
                    N
                  </div>
                  <div className="font-black">NOVA Ride</div>
                </div>
              </div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                <Sparkles size={14} /> دخول آمن لمركز التحكم
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                مرحبًا بعودتك
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-gray-400">
                استخدم حساب الموظف الذي أنشأه مدير النظام.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-bold text-slate-700 dark:text-gray-300"
                >
                  اسم المستخدم
                </label>
                <input
                  id="username"
                  type="text"
                  inputMode="text"
                  autoComplete="username"
                  dir="ltr"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  placeholder="admin"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-400"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-bold text-slate-700 dark:text-gray-300"
                >
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    dir="ltr"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-12 py-3 text-left text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-400"
                  />
                  <LockKeyhole
                    size={18}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !username.trim() || !password}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={19} className="animate-spin" /> جارٍ
                    التحقق...
                  </>
                ) : (
                  "دخول إلى مركز التحكم"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              الدخول مراقب ومسجل ضمن سجل التدقيق الأمني.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
