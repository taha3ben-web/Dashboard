"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, money, num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

interface WithdrawalRow {
  id: string;
  amount: number;
  status: string;
  note?: string | null;
  createdAt: string;
  processedAt?: string | null;
  user?: { name?: string; phone?: string };
  driver?: { id: string };
}

interface Summary {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
}

const STATUSES = ["", "PENDING", "APPROVED", "PAID", "REJECTED"];

export default function WithdrawalsPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const canManagePayments = can("payments.manage");

  const load = useCallback(() => {
    setError("");
    Promise.all([
      api.get("/withdrawals", {
        params: {
          page,
          limit: 20,
          status: status || undefined,
          search: search || undefined,
        },
      }),
      api.get("/withdrawals/summary", {
        params: { status: status || undefined, search: search || undefined },
      }),
    ])
      .then(([rowsResponse, summaryResponse]) => {
        setRows(rowsResponse.data.items ?? []);
        setTotal(rowsResponse.data.total ?? 0);
        setSummary(summaryResponse.data ?? null);
      })
      .catch((loadError) => {
        setRows([]);
        setTotal(0);
        setSummary(null);
        setError(getApiErrorMessage(loadError, "تعذّر تحميل السحوبات"));
      });
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function process(
    row: WithdrawalRow,
    action: "approve" | "paid" | "reject",
  ) {
    if (!canManagePayments || busyId) return;
    const allowed =
      (row.status === "PENDING" &&
        (action === "approve" || action === "reject")) ||
      (row.status === "APPROVED" && action === "paid");
    if (!allowed) {
      setError("انتقال حالة السحب غير مسموح.");
      return;
    }
    const label =
      action === "approve" ? "اعتماد" : action === "paid" ? "تأكيد دفع" : "رفض";
    if (!window.confirm(`${label} طلب السحب؟`)) return;
    const note =
      action === "reject"
        ? window.prompt("سبب الرفض (مطلوب):")?.trim()
        : window.prompt("ملاحظة العملية (اختيارية):")?.trim();
    if (action === "reject" && !note) {
      setError("سبب الرفض مطلوب للتدقيق.");
      return;
    }
    setBusyId(row.id);
    setError("");
    setNotice("");
    try {
      await api.patch(`/withdrawals/${row.id}/${action}`, {
        note: note || undefined,
      });
      setNotice(`تم ${label} الطلب بنجاح.`);
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تنفيذ العملية"));
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<WithdrawalRow>[] = [
    {
      key: "user",
      header: "السائق",
      render: (row) => (
        <div>
          <div className="font-medium">{row.user?.name ?? "-"}</div>
          <div className="text-xs text-gray-500">{row.user?.phone ?? "-"}</div>
        </div>
      ),
    },
    { key: "amount", header: "المبلغ", render: (row) => money(row.amount) },
    {
      key: "status",
      header: "الحالة",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "note", header: "الملاحظة", render: (row) => row.note ?? "-" },
    {
      key: "createdAt",
      header: "الإنشاء",
      render: (row) => dateTime(row.createdAt),
    },
    {
      key: "processedAt",
      header: "المعالجة",
      render: (row) => dateTime(row.processedAt),
    },
    {
      key: "actions",
      header: "الإجراء",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {canManagePayments ? (
            <>
              <button
                disabled={row.status !== "PENDING" || busyId === row.id}
                onClick={() => void process(row, "approve")}
                className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600 disabled:opacity-30"
              >
                اعتماد
              </button>
              <button
                disabled={row.status !== "APPROVED" || busyId === row.id}
                onClick={() => void process(row, "paid")}
                className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-600 disabled:opacity-30"
              >
                تم الدفع
              </button>
              <button
                disabled={row.status !== "PENDING" || busyId === row.id}
                onClick={() => void process(row, "reject")}
                className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600 disabled:opacity-30"
              >
                رفض
              </button>
            </>
          ) : (
            <span className="text-xs text-gray-400">عرض فقط</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Topbar title="السحوبات" />
      <div className="space-y-6 p-6">
        {!canManagePayments ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            الصفحة في وضع القراءة فقط لهذا الدور. أوامر الاعتماد والدفع والرفض
            متاحة فقط لمن لديهم صلاحية الإدارة المالية.
          </div>
        ) : null}

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <Briefcase size={18} />
            <span className="font-medium">
              المسار المحكوم: PENDING → APPROVED → PAID، أو PENDING → REJECTED
            </span>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="إجمالي الطلبات"
            value={num(summary?.totalCount)}
            icon={<Briefcase size={18} />}
            accent="blue"
          />
          <StatCard
            label="إجمالي القيمة"
            value={money(summary?.totalAmount)}
            icon={<Briefcase size={18} />}
            accent="green"
          />
          <StatCard
            label="قيد الانتظار"
            value={num(summary?.pendingCount)}
            icon={<Briefcase size={18} />}
            accent="amber"
          />
          <StatCard
            label="مدفوعة"
            value={num(summary?.paidCount)}
            icon={<Briefcase size={18} />}
            accent="green"
          />
        </section>

        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            {STATUSES.map((value) => (
              <option key={value || "all"} value={value}>
                {value || "كل الحالات"}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="بحث بالاسم أو الهاتف أو الملاحظة"
            className="min-w-72 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}
        <DataTable columns={columns} rows={rows} empty="لا توجد طلبات سحب" />

        <div className="flex justify-between text-sm text-gray-500">
          <span>الإجمالي: {num(total)}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              السابق
            </button>
            <span>{page}</span>
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
