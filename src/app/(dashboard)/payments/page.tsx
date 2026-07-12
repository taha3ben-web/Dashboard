"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { dateTime, money, num } from "@/lib/format";

interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  provider: string;
  providerStatus?: string | null;
  status: string;
  reference?: string | null;
  createdAt: string;
  authorizedAt?: string | null;
  capturedAt?: string | null;
  refundedAt?: string | null;
  user: { name: string; phone: string };
  trip: { id: string; fare?: number | null; status: string };
}

interface PaymentSummary {
  totalCount: number;
  totalAmount: number;
  capturedAmount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
}

const STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "PENDING", label: "PENDING" },
  { value: "AUTHORIZED", label: "AUTHORIZED" },
  { value: "CAPTURED", label: "CAPTURED" },
  { value: "PAID", label: "PAID" },
  { value: "FAILED", label: "FAILED" },
  { value: "REFUNDED", label: "REFUNDED" },
  { value: "CANCELED", label: "CANCELED" },
];

const METHOD_OPTIONS = [
  { value: "", label: "كل الوسائل" },
  { value: "CASH", label: "CASH" },
  { value: "CARD", label: "CARD" },
  { value: "WALLET", label: "WALLET" },
];

const statusClass = (status: string): string => {
  switch (status) {
    case "CAPTURED":
    case "PAID":
      return "bg-green-500/10 text-green-600 dark:text-green-300";
    case "AUTHORIZED":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-300";
    case "REFUNDED":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
    case "FAILED":
    case "CANCELED":
      return "bg-red-500/10 text-red-600 dark:text-red-300";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-300";
  }
};

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [provider, setProvider] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    const params = {
      page,
      limit: 20,
      status: status || undefined,
      method: method || undefined,
      provider: provider || undefined,
      search: search || undefined,
    };
    Promise.all([
      api.get("/payments", { params }),
      api.get("/payments/summary", { params }),
    ])
      .then(([listResponse, summaryResponse]) => {
        setRows(listResponse.data.items ?? []);
        setTotal(listResponse.data.total ?? 0);
        setSummary(summaryResponse.data ?? null);
      })
      .catch((loadError) => {
        setRows([]);
        setTotal(0);
        setSummary(null);
        setError(
          loadError instanceof Error ? loadError.message : "تعذّر تحميل المدفوعات",
        );
      });
  }, [method, page, provider, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (id: string, action: "capture" | "refund" | "cancel") => {
      setBusyId(id);
      setError("");
      try {
        await api.post(`/payments/${id}/${action}`, {});
        await load();
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : "تعذّر تنفيذ الإجراء",
        );
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const columns = useMemo<Column<PaymentRow>[]>(
    () => [
      {
        key: "passenger",
        header: "الراكب",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.user.name}</span>
            <span className="text-xs text-gray-500">{row.user.phone}</span>
          </div>
        ),
      },
      {
        key: "trip",
        header: "الرحلة",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs">{row.trip.id.slice(0, 8)}</span>
            <span className="text-xs text-gray-500">{row.trip.status}</span>
          </div>
        ),
      },
      { key: "amount", header: "المبلغ", render: (row) => money(row.amount) },
      { key: "method", header: "الوسيلة" },
      {
        key: "provider",
        header: "المزوّد",
        render: (row) => (
          <div className="flex flex-col">
            <span>{row.provider}</span>
            <span className="text-xs text-gray-500">{row.providerStatus ?? "-"}</span>
          </div>
        ),
      },
      {
        key: "status",
        header: "الحالة",
        render: (row) => (
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(row.status)}`}>
            {row.status}
          </span>
        ),
      },
      {
        key: "timestamps",
        header: "آخر توقيت",
        render: (row) => dateTime(row.capturedAt ?? row.authorizedAt ?? row.createdAt),
      },
      {
        key: "actions",
        header: "إجراءات",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/payments/${row.id}`}
              className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
            >
              التفاصيل
            </Link>
            {(row.status === "PENDING" || row.status === "AUTHORIZED") && (
              <button
                onClick={() => void runAction(row.id, "capture")}
                disabled={busyId === row.id}
                className="rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                التقط
              </button>
            )}
            {(row.status === "PENDING" || row.status === "AUTHORIZED") && (
              <button
                onClick={() => void runAction(row.id, "cancel")}
                disabled={busyId === row.id}
                className="rounded-lg bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200"
              >
                إلغاء
              </button>
            )}
            {(row.status === "CAPTURED" || row.status === "PAID") && (
              <button
                onClick={() => void runAction(row.id, "refund")}
                disabled={busyId === row.id}
                className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                استرداد
              </button>
            )}
          </div>
        ),
      },
    ],
    [busyId, runAction],
  );

  return (
    <>
      <Topbar title="المدفوعات" />
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="إجمالي المدفوعات" value={num(summary?.totalCount)} icon={<CreditCard size={18} />} />
          <StatCard label="القيمة الكلية" value={money(summary?.totalAmount)} icon={<ShieldCheck size={18} />} accent="brand" />
          <StatCard label="القيمة الملتقطة" value={money(summary?.capturedAmount)} icon={<ShieldCheck size={18} />} accent="green" />
          <StatCard label="الاستردادات" value={num(summary?.refundedCount)} icon={<RotateCcw size={18} />} accent="amber" />
          <StatCard label="المعلّقة" value={num(summary?.pendingCount)} icon={<CreditCard size={18} />} accent="blue" />
          <StatCard label="الفاشلة" value={num(summary?.failedCount)} icon={<XCircle size={18} />} accent="red" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={method}
            onChange={(event) => {
              setPage(1);
              setMethod(event.target.value);
            }}
            className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
          >
            {METHOD_OPTIONS.map((option) => (
              <option key={option.value || "all-methods"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={provider}
            onChange={(event) => {
              setPage(1);
              setProvider(event.target.value);
            }}
            placeholder="المزوّد"
            className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
          />
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="بحث بالراكب أو المرجع أو الرحلة"
            className="min-w-[260px] rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
          />
          <div className="text-sm text-gray-500">الإجمالي: {num(total)}</div>
        </div>

        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <DataTable columns={columns} rows={rows} empty="لا توجد مدفوعات" />

        <div className="flex justify-between text-sm text-gray-500">
          <span>الصفحة الحالية: {page}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              السابق
            </button>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage((value) => value + 1)}
            >
              التالي
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
