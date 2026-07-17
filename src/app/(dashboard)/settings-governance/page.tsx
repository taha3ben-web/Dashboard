"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { num, dateTime } from "@/lib/format";

interface Totals {
  total: number;
  published: number;
  drafts: number;
  publicCount: number;
  sensitiveCount: number;
  pendingChangeRequests: number;
}
interface Draft {
  id: string;
  key: string;
  group: string | null;
  isPublic: boolean;
  isSensitive: boolean;
  version: number;
  publishedVersion: number;
  publishedAt: string | null;
  updatedAt: string;
  hasPendingRequest: boolean;
}
interface Change {
  id: string;
  key: string;
  group: string | null;
  publishedVersion: number;
  sourceVersion: number;
  action: string;
  publishedById: string | null;
  createdAt: string;
}
interface Request {
  id: string;
  key: string;
  group: string | null;
  sourceVersion: number;
  requestedBy: string | null;
  createdAt: string;
}
interface Overview {
  totals: Totals;
  pendingDrafts: Draft[];
  recentChanges: Change[];
  pendingRequests: Request[];
}

const AUTO_REFRESH_MS = 30000;

export default function SettingsGovernancePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
    code?: string;
  } | null>(null);

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const res = await api.get("/settings/governance/overview", {
        params: { limit: 30 },
      });
      setData(res.data ?? null);
      if (manual)
        setNotice({ kind: "success", text: "تم تحديث حوكمة الإعدادات." });
    } catch (e) {
      setNotice({
        kind: "error",
        text: getApiErrorMessage(e, "تعذّر تحميل حوكمة الإعدادات"),
        code: getApiErrorCode(e),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), AUTO_REFRESH_MS);
    return () => window.clearInterval(t);
  }, [load]);

  const t = data?.totals;

  return (
    <>
      <Topbar title="Settings Governance" />
      <main className="space-y-5 p-4 sm:p-6">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Stage 46 · Platform Config
            </p>
            <h1 className="mt-1 text-2xl font-bold">حوكمة الإعدادات</h1>
            <p className="mt-1 text-sm text-slate-500">
              نظرة موحّدة للمسودّات والطلبات المعلّقة وسجل التغييرات —
              قراءة فقط.
            </p>
          </div>
          <button
            onClick={() => void load(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            تحديث
          </button>
        </section>

        {notice ? (
          <div
            className={`flex gap-2 rounded-xl border p-4 text-sm ${
              notice.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {notice.kind === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
            <div>
              {notice.text}
              {notice.code ? (
                <div className="font-mono text-xs">code: {notice.code}</div>
              ) : null}
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="إجمالي الإعدادات" value={num(t?.total)} />
          <Metric label="منشورة" value={num(t?.published)} />
          <Metric
            label="مسودّات"
            value={num(t?.drafts)}
            warn={(t?.drafts ?? 0) > 0}
          />
          <Metric label="عامّة" value={num(t?.publicCount)} />
          <Metric label="حساسة" value={num(t?.sensitiveCount)} />
          <Metric
            label="طلبات معلّقة"
            value={num(t?.pendingChangeRequests)}
            warn={(t?.pendingChangeRequests ?? 0) > 0}
          />
        </section>

        <section className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">مسودّات بانتظار النشر</h2>
            <Link
              href="/settings"
              className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              الإعدادات
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-right text-xs text-slate-400">
                <tr>
                  <th className="p-2">المفتاح</th>
                  <th className="p-2">المجموعة</th>
                  <th className="p-2">الإصدار/المنشور</th>
                  <th className="p-2">الخصائص</th>
                  <th className="p-2">طلب معلّق</th>
                  <th className="p-2">آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {(data?.pendingDrafts ?? []).map((s) => (
                  <tr key={s.id} className="border-t dark:border-gray-800">
                    <td className="p-2 font-mono text-xs font-semibold">
                      {s.key}
                    </td>
                    <td className="p-2">{s.group ?? "—"}</td>
                    <td className="p-2">
                      {num(s.version)} / {num(s.publishedVersion)}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {s.isPublic ? (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                            عامّ
                          </span>
                        ) : null}
                        {s.isSensitive ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                            حساس
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-2">
                      {s.hasPendingRequest ? (
                        <span className="text-xs font-bold text-amber-600">
                          نعم
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-2 text-xs text-slate-500">
                      {dateTime(s.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !(data?.pendingDrafts ?? []).length ? (
              <p className="p-3 text-sm text-emerald-600">
                ✓ لا توجد مسودّات بانتظار النشر.
              </p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">طلبات تغيير معلّقة</h2>
              <Link
                href="/setting-approvals"
                className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                الموافقات
              </Link>
            </div>
            <ul className="space-y-2">
              {(data?.pendingRequests ?? []).map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border p-3 text-sm dark:border-gray-800"
                >
                  <div className="font-mono text-xs font-semibold">{r.key}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {r.requestedBy ?? "—"} · {dateTime(r.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
            {!loading && !(data?.pendingRequests ?? []).length ? (
              <p className="p-3 text-sm text-emerald-600">✓ لا توجد طلبات معلّقة.</p>
            ) : null}
          </div>

          <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 font-bold">أحدث التغييرات</h2>
            <ul className="space-y-2">
              {(data?.recentChanges ?? []).map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border p-3 text-sm dark:border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold">
                      {c.key}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                      {c.action}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    v{num(c.publishedVersion)} · {dateTime(c.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
            {!loading && !(data?.recentChanges ?? []).length ? (
              <p className="p-3 text-sm text-slate-500">لا يوجد سجل تغييرات.</p>
            ) : null}
          </div>
        </section>

        {loading ? (
          <p className="text-sm text-slate-500">جارٍ التحميل...</p>
        ) : null}
      </main>
    </>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {warn ? (
        <AlertTriangle className="text-amber-600" />
      ) : (
        <ClipboardCheck className="text-indigo-600" />
      )}
      <div className="mt-3 text-xl font-black">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}
