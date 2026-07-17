"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { num, dateTime } from "@/lib/format";

interface Totals {
  total: number;
  enabled: number;
  disabled: number;
  scheduled: number;
  expired: number;
  partialRollout: number;
  scoped: number;
  needsAttention: number;
  killed: number;
}
interface FlagItem {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  platform: string;
  effectivePercentage: number;
  rolloutPercentage: number;
  hasRolloutPlan: boolean;
  scoped: boolean;
  cityCount: number;
  countryCodes: string[];
  appIds: string[];
  clientOs: string[];
  audienceSegments: string[];
  minAppVersion: string | null;
  maxAppVersion: string | null;
  startsAt: string | null;
  endsAt: string | null;
  version: number;
  updatedAt: string;
  health: string[];
  attention: boolean;
}
interface Health {
  control: { globalKillSwitch: boolean; globalKillReason: string | null };
  evaluatedAt: string;
  totals: Totals;
  items: FlagItem[];
}

const AUTO_REFRESH_MS = 30000;

const HEALTH_LABEL: Record<string, string> = {
  KILLED: "موقوف عالميًا",
  EXPIRED_ENABLED: "منتهٍ ومفعّل",
  EXPIRED: "منتهٍ",
  SCHEDULED: "مجدول",
  ENDING_SOON: "ينتهي قريبًا",
  PARTIAL_ROLLOUT: "توزيع جزئي",
  STALE: "راكد",
};
const HEALTH_STYLE: Record<string, string> = {
  KILLED: "bg-red-100 text-red-700",
  EXPIRED_ENABLED: "bg-red-100 text-red-700",
  EXPIRED: "bg-slate-200 text-slate-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  ENDING_SOON: "bg-amber-100 text-amber-700",
  PARTIAL_ROLLOUT: "bg-indigo-100 text-indigo-700",
  STALE: "bg-amber-100 text-amber-700",
};

export default function FeatureFlagsHealthPage() {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "ATTENTION">("ALL");
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
    code?: string;
  } | null>(null);

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const res = await api.get("/feature-flags/health");
      setData(res.data ?? null);
      if (manual)
        setNotice({ kind: "success", text: "تم تحديث صحة المفاتيح." });
    } catch (e) {
      setNotice({
        kind: "error",
        text: getApiErrorMessage(e, "تعذّر تحميل صحة المفاتيح"),
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
  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return filter === "ATTENTION" ? items.filter((i) => i.attention) : items;
  }, [data, filter]);

  return (
    <>
      <Topbar title="Feature Flags Health" />
      <main className="space-y-5 p-4 sm:p-6">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Stage 47 · Platform Config
            </p>
            <h1 className="mt-1 text-2xl font-bold">صحة مفاتيح الميزات</h1>
            <p className="mt-1 text-sm text-slate-500">
              نظرة دورة حياة للمفاتيح: منتهٍ، مجدول، توزيع جزئي، راكد —
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

        {data?.control.globalKillSwitch ? (
          <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <ShieldAlert size={18} />
            <div>
              <div className="font-bold">مفتاح الإيقاف العام مُفعّل</div>
              <div>
                {data.control.globalKillReason ||
                  "جميع المفاتيح المفعّلة موقوفة فعليًا."}
              </div>
            </div>
          </div>
        ) : null}

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
          <Metric label="الإجمالي" value={num(t?.total)} />
          <Metric label="مفعّلة" value={num(t?.enabled)} />
          <Metric label="مجدولة" value={num(t?.scheduled)} />
          <Metric
            label="توزيع جزئي"
            value={num(t?.partialRollout)}
          />
          <Metric label="منتهية" value={num(t?.expired)} />
          <Metric
            label="تحتاج انتباهًا"
            value={num(t?.needsAttention)}
            warn={(t?.needsAttention ?? 0) > 0}
          />
        </section>

        <section className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(["ALL", "ATTENTION"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                    filter === f
                      ? "bg-brand text-white"
                      : "border text-slate-600 dark:border-gray-700 dark:text-gray-300"
                  }`}
                >
                  {f === "ALL" ? "الكل" : "تحتاج انتباهًا"}
                </button>
              ))}
            </div>
            <Link
              href="/feature-flags"
              className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              إدارة المفاتيح
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-right text-xs text-slate-400">
                <tr>
                  <th className="p-2">المفتاح</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">التوزيع الفعّال</th>
                  <th className="p-2">النطاق</th>
                  <th className="p-2">إشارات الصحة</th>
                  <th className="p-2">آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id} className="border-t dark:border-gray-800">
                    <td className="p-2">
                      <div className="font-mono text-xs font-semibold">
                        {f.key}
                      </div>
                      {f.description ? (
                        <div className="text-xs text-slate-400">
                          {f.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-2">
                      {f.enabled ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                          مفعّل
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
                          معطّل
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      {num(f.effectivePercentage)}%
                      {f.hasRolloutPlan ? (
                        <span className="mr-1 text-xs text-slate-400">
                          (خطة)
                        </span>
                      ) : null}
                    </td>
                    <td className="p-2 text-xs text-slate-500">
                      {f.scoped ? f.platform : "الكل"}
                      {f.cityCount > 0 ? ` · ${num(f.cityCount)} مدن` : ""}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {f.health.length ? (
                          f.health.map((h) => (
                            <span
                              key={h}
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                HEALTH_STYLE[h] ?? "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {HEALTH_LABEL[h] ?? h}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-emerald-600">✓ سليم</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-xs text-slate-500">
                      {dateTime(f.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !rows.length ? (
              <p className="p-3 text-sm text-emerald-600">
                ✓ لا توجد مفاتيح مطابقة.
              </p>
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
        <Activity className="text-indigo-600" />
      )}
      <div className="mt-3 text-xl font-black">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}
