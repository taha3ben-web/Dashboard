"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCcw, ShieldCheck, TimerReset } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { DataTable, type Column } from "@/components/DataTable";
import { api } from "@/lib/api";
import { dateTime, money, num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

interface ReconciliationSummary {
  completedTrips: number;
  settledTrips: number;
  unsettledTrips: number;
  missingPayments: number;
  missingDriverEarnings: number;
  missingCompanyEarnings: number;
  paymentLedgerMismatch: number;
  withdrawalLedgerMismatch: number;
  fundingLedgerMismatch: number;
  transferLedgerMismatch: number;
}

interface ReconciliationItem {
  id: string;
  type: string;
  referenceId: string;
  title: string;
  detail: string;
  createdAt: string;
  severity: "high" | "medium";
}

interface SettlementQueueItem {
  id: string;
  fare?: number | null;
  completedAt?: string | null;
  settlementAttempts: number;
  settlementError?: string | null;
  passenger?: { name?: string | null; phone?: string | null };
  driver?: { user?: { name?: string | null; phone?: string | null } | null } | null;
  payment?: { method?: string; status?: string } | null;
}

interface SettlementRunResult {
  requested: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ tripId: string; error: string }>;
}

const TYPES = [
  "",
  "UNSETTLED_TRIP",
  "MISSING_PAYMENT",
  "MISSING_DRIVER_EARNING",
  "MISSING_COMPANY_EARNING",
  "PAYMENT_LEDGER_GAP",
  "WITHDRAWAL_LEDGER_GAP",
  "FUNDING_LEDGER_GAP",
  "TRANSFER_LEDGER_GAP",
];

export default function FinancialControlPage() {
  const { can } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsPage, setItemsPage] = useState(1);
  const [queue, setQueue] = useState<SettlementQueueItem[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queuePage, setQueuePage] = useState(1);
  const [runResult, setRunResult] = useState<SettlementRunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canManagePayments = can("payments.manage");

  const params = useMemo(() => {
    const next: Record<string, string | number | boolean> = {};
    if (from) next.from = new Date(`${from}T00:00:00.000Z`).toISOString();
    if (to) next.to = new Date(`${to}T23:59:59.999Z`).toISOString();
    if (type) next.type = type;
    if (search) next.search = search;
    if (onlyFailed) next.onlyFailed = true;
    return next;
  }, [from, to, type, search, onlyFailed]);

  const load = useCallback(() => {
    setError("");
    Promise.all([
      api.get("/financial/reconciliation/summary", { params }),
      api.get("/financial/reconciliation/items", {
        params: { ...params, page: itemsPage, limit: 20 },
      }),
      api.get("/financial/settlement/queue", {
        params: { ...params, page: queuePage, limit: 20 },
      }),
    ])
      .then(([summaryResponse, itemsResponse, queueResponse]) => {
        setSummary(summaryResponse.data ?? null);
        setItems(itemsResponse.data.items ?? []);
        setItemsTotal(itemsResponse.data.total ?? 0);
        setQueue(queueResponse.data.items ?? []);
        setQueueTotal(queueResponse.data.total ?? 0);
      })
      .catch((loadError) => {
        setSummary(null);
        setItems([]);
        setItemsTotal(0);
        setQueue([]);
        setQueueTotal(0);
        setError(
          loadError instanceof Error ? loadError.message : "تعذّر تحميل المطابقة والتسوية",
        );
      });
  }, [itemsPage, params, queuePage]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSettlementBatch() {
    if (!canManagePayments) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.post("/financial/settlement/run", {
        limit: 25,
        onlyFailed,
        search: search || undefined,
        from: params.from,
        to: params.to,
      });
      setRunResult(response.data ?? null);
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "تعذّر تشغيل دفعة التسوية",
      );
    } finally {
      setBusy(false);
    }
  }

  const itemColumns = useMemo<Column<ReconciliationItem>[]>(
    () => [
      {
        key: "type",
        header: "النوع",
        render: (row) => (
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              row.severity === "high"
                ? "bg-red-500/10 text-red-600 dark:text-red-300"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-300"
            }`}
          >
            {row.type}
          </span>
        ),
      },
      { key: "referenceId", header: "المرجع" },
      { key: "title", header: "العنوان" },
      { key: "detail", header: "التفاصيل" },
      {
        key: "createdAt",
        header: "التاريخ",
        render: (row) => dateTime(row.createdAt),
      },
    ],
    [],
  );

  const queueColumns = useMemo<Column<SettlementQueueItem>[]>(
    () => [
      {
        key: "id",
        header: "الرحلة",
        render: (row) => row.id.slice(0, 8),
      },
      {
        key: "passenger",
        header: "الراكب",
        render: (row) => row.passenger?.name ?? "-",
      },
      {
        key: "driver",
        header: "السائق",
        render: (row) => row.driver?.user?.name ?? "-",
      },
      {
        key: "fare",
        header: "التكلفة",
        render: (row) => money(row.fare),
      },
      {
        key: "payment",
        header: "الدفع",
        render: (row) => `${row.payment?.method ?? "-"} / ${row.payment?.status ?? "-"}`,
      },
      {
        key: "attempts",
        header: "المحاولات",
        render: (row) => num(row.settlementAttempts),
      },
      {
        key: "error",
        header: "آخر خطأ",
        render: (row) => row.settlementError ?? "-",
      },
      {
        key: "completedAt",
        header: "وقت الإكمال",
        render: (row) => dateTime(row.completedAt),
      },
    ],
    [],
  );

  return (
    <>
      <Topbar title="المطابقة والتسوية" />
      <div className="space-y-6 p-4 sm:p-6">
        {!canManagePayments ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذا الدور يستطيع مراجعة فروقات المطابقة وطابور التسوية فقط. تشغيل دفعات التسوية مخفي حتى تتوفر صلاحية الإدارة المالية.
          </div>
        ) : null}

        <section className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <div className="mb-1 text-xs text-gray-500">من</div>
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setItemsPage(1);
                setQueuePage(1);
                setFrom(event.target.value);
              }}
              className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-gray-500">إلى</div>
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setItemsPage(1);
                setQueuePage(1);
                setTo(event.target.value);
              }}
              className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <select
            value={type}
            onChange={(event) => {
              setItemsPage(1);
              setType(event.target.value);
            }}
            className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            {TYPES.map((value) => (
              <option key={value || "all-types"} value={value}>
                {value || "كل أنواع الفروقات"}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => {
              setItemsPage(1);
              setQueuePage(1);
              setSearch(event.target.value);
            }}
            placeholder="بحث بالرحلة أو السائق أو المرجع"
            className="min-w-[280px] rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={onlyFailed}
              onChange={(event) => {
                setQueuePage(1);
                setOnlyFailed(event.target.checked);
              }}
            />
            المتعثرة فقط
          </label>
          <button
            onClick={() => void load()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
          >
            تحديث
          </button>
          {canManagePayments ? (
            <button
              onClick={() => void runSettlementBatch()}
              disabled={busy}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              تشغيل دفعة التسوية
            </button>
          ) : null}
        </section>

        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="رحلات مكتملة" value={num(summary?.completedTrips)} icon={<ShieldCheck size={18} />} />
          <StatCard label="غير مسوّاة" value={num(summary?.unsettledTrips)} icon={<AlertTriangle size={18} />} accent="amber" />
          <StatCard label="فجوات المدفوعات" value={num(summary?.missingPayments)} icon={<RefreshCcw size={18} />} accent="red" />
          <StatCard label="فجوات الدفتر" value={num((summary?.paymentLedgerMismatch ?? 0) + (summary?.withdrawalLedgerMismatch ?? 0) + (summary?.fundingLedgerMismatch ?? 0) + (summary?.transferLedgerMismatch ?? 0))} icon={<TimerReset size={18} />} accent="blue" />
          <StatCard label="رحلات مسوّاة" value={num(summary?.settledTrips)} icon={<ShieldCheck size={18} />} accent="green" />
        </section>

        {runResult ? (
          <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-2 font-semibold">نتيجة آخر تشغيل</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div>المطلوب: {num(runResult.requested)}</div>
              <div>المعالَج: {num(runResult.processed)}</div>
              <div>نجحت: {num(runResult.succeeded)}</div>
              <div>فشلت: {num(runResult.failed)}</div>
              <div>الأخطاء: {num(runResult.errors.length)}</div>
            </div>
            {runResult.errors.length > 0 ? (
              <div className="mt-3 space-y-1 text-red-500">
                {runResult.errors.slice(0, 5).map((item) => (
                  <div key={`${item.tripId}-${item.error}`}>
                    {item.tripId.slice(0, 8)} — {item.error}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">فروقات المطابقة</h2>
            <span className="text-sm text-gray-500">الإجمالي: {num(itemsTotal)}</span>
          </div>
          <DataTable columns={itemColumns} rows={items} empty="لا توجد فروقات حالية" />
          <Pager page={itemsPage} total={itemsTotal} onChange={setItemsPage} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">طابور التسوية</h2>
            <span className="text-sm text-gray-500">الإجمالي: {num(queueTotal)}</span>
          </div>
          <DataTable columns={queueColumns} rows={queue} empty="لا توجد رحلات معلّقة للتسوية" />
          <Pager page={queuePage} total={queueTotal} onChange={setQueuePage} />
        </section>
      </div>
    </>
  );
}

function Pager({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (value: number | ((value: number) => number)) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / 20));
  return (
    <div className="flex items-center justify-between text-sm text-gray-500">
      <span>
        {page} / {pages}
      </span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange((value: number) => value - 1)}
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
        >
          السابق
        </button>
        <button
          disabled={page >= pages}
          onClick={() => onChange((value: number) => value + 1)}
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
        >
          التالي
        </button>
      </div>
    </div>
  );
}
