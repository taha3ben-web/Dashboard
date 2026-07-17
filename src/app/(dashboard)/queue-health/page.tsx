"use client";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { api, getApiErrorMessage } from "@/lib/api";
import { num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

type Severity = "healthy" | "warning" | "critical";

interface Insight {
  severity: Severity;
  backlog: number;
  pending: number;
  failed: number;
  dead: number;
  delivered: number;
  oldestPendingAgeMinutes: number | null;
  dlqRatio: number;
  stalled: boolean;
  recommendations: string[];
  generatedAt: string;
}

interface BacklogRow {
  id?: string;
  name: string;
  pending: number;
  failed: number;
  delivered: number;
  dead: number;
  backlog: number;
  total: number;
}

const SEVERITY_STYLE: Record<Severity, string> = {
  healthy: "border-emerald-300 bg-emerald-50 text-emerald-800",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  critical: "border-red-300 bg-red-50 text-red-800",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  healthy: "سليم",
  warning: "تحذير",
  critical: "حرِج",
};

export default function QueueHealthPage() {
  const { can } = useAuth();
  const canPurge = can("settings.manage");
  const canRetry = can("payments.manage");
  const [insight, setInsight] = useState<Insight | null>(null);
  const [rows, setRows] = useState<BacklogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(14);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, b] = await Promise.all([
        api.get("/dashboard/queue/insight"),
        api.get("/dashboard/queue/backlog-by-name", { params: { limit: 50 } }),
      ]);
      setInsight(i.data ?? null);
      setRows(Array.isArray(b.data) ? b.data : []);
    } catch (e) {
      setNotice({
        kind: "error",
        text: getApiErrorMessage(e, "تعذّر تحميل حالة الطابور"),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retryAll = useCallback(async () => {
    if (!window.confirm("إعادة جدولة رسائل DLQ لمحاولة جديدة؟")) return;
    setBusy(true);
    try {
      const res = await api.post("/dashboard/queue/dead-letters/retry-all", {
        limit: 100,
      });
      setNotice({
        kind: "success",
        text: `أُعيدت جدولة ${num(res.data?.requeued ?? 0)} رسالة.`,
      });
      await load();
    } catch (e) {
      setNotice({
        kind: "error",
        text: getApiErrorMessage(e, "تعذّرت إعادة الجدولة"),
      });
    } finally {
      setBusy(false);
    }
  }, [load]);

  const purge = useCallback(async () => {
    if (
      !window.confirm(
        `حذف سجلات الأحداث المُسلَّمة الأقدم من ${days} يومًا؟`,
      )
    )
      return;
    setBusy(true);
    try {
      const res = await api.post("/dashboard/queue/purge-delivered", {
        olderThanDays: days,
      });
      setNotice({
        kind: "success",
        text: `حُذف ${num(res.data?.deleted ?? 0)} سجلًّا مُسلَّمًا.`,
      });
      await load();
    } catch (e) {
      setNotice({
        kind: "error",
        text: getApiErrorMessage(e, "تعذّر التنظيف"),
      });
    } finally {
      setBusy(false);
    }
  }, [days, load]);

  const severity = insight?.severity ?? "healthy";
  const columns: Column<BacklogRow>[] = [
    { key: "name", header: "اسم الحدث", render: (r) => <b>{r.name}</b> },
    { key: "pending", header: "معلّق", render: (r) => num(r.pending) },
    { key: "failed", header: "فاشل", render: (r) => num(r.failed) },
    {
      key: "dead",
      header: "DLQ",
      render: (r) => (
        <span className={r.dead > 0 ? "font-bold text-red-600" : ""}>
          {num(r.dead)}
        </span>
      ),
    },
    { key: "delivered", header: "مُسلَّم", render: (r) => num(r.delivered) },
    { key: "total", header: "الإجمالي", render: (r) => num(r.total) },
  ];

  return (
    <>
      <Topbar title="صحّة الطابور الخلفي" />
      <main className="space-y-5 p-4 sm:p-6">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Stage 74 · Background Queue
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              رؤية وصيانة الطابور الخلفي (Outbox)
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              عمق التراكم وتقادمه، وتفصيل حسب الحدث، وإعادة جدولة DLQ، وتنظيف
              السجلات المُسلَّمة.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading || busy}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? (
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
            <div>{notice.text}</div>
          </div>
        ) : null}

        <section className={`rounded-2xl border p-5 ${SEVERITY_STYLE[severity]}`}>
          <div className="flex items-center gap-2 font-bold">
            <Gauge />
            الحالة العامة: {SEVERITY_LABEL[severity]}
            {insight?.stalled ? (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                متوقّف
              </span>
            ) : null}
          </div>
          <ul className="mt-3 list-disc space-y-1 pr-5 text-sm">
            {(insight?.recommendations ?? []).map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="التراكم (معلّق+فاشل)" value={num(insight?.backlog)} />
          <Metric
            label="أقدم عنصر معلّق (دقيقة)"
            value={
              insight?.oldestPendingAgeMinutes == null
                ? "—"
                : num(insight.oldestPendingAgeMinutes)
            }
          />
          <Metric label="DLQ" value={num(insight?.dead)} danger={(insight?.dead ?? 0) > 0} />
          <Metric
            label="نسبة DLQ"
            value={`${((insight?.dlqRatio ?? 0) * 100).toFixed(2)}%`}
          />
        </section>

        <section className="flex flex-wrap items-end gap-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <button
            onClick={() => void retryAll()}
            disabled={busy || !canRetry || (insight?.dead ?? 0) === 0}
            className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 disabled:opacity-50"
          >
            <RotateCcw size={16} />
            إعادة جدولة DLQ
          </button>
          <div className="flex items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">حذف المُسلَّم الأقدم من (يوم)</span>
              <input
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 1)}
                className="w-28 rounded-xl border px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
              />
            </label>
            <button
              onClick={() => void purge()}
              disabled={busy || !canPurge}
              className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              <Trash2 size={16} />
              تنظيف السجلات المُسلَّمة
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-bold">التراكم حسب اسم الحدث</h2>
          <DataTable<BacklogRow>
            columns={columns}
            rows={rows}
            loading={loading}
            empty="لا توجد أحداث في الطابور."
            emptyIcon={Gauge}
          />
        </section>
      </main>
    </>
  );
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div
        className={`text-2xl font-black ${danger ? "text-red-600" : ""}`}
      >
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}
