"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { money, num, dateTime } from "@/lib/format";
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  CalendarDays,
  Clock3,
  CircleCheck,
  CircleX,
} from "lucide-react";

interface Earnings {
  totalCompany: number;
  totalDriverPayouts: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
}

interface WithdrawalSummary {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
}

interface Withdraw {
  id: string;
  amount: number;
  status: string;
  note?: string | null;
  createdAt: string;
  processedAt?: string | null;
  user?: { name: string; phone: string };
}

const STATUSES = ["", "PENDING", "APPROVED", "PAID", "REJECTED"];

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);
  const [rows, setRows] = useState<Withdraw[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadWithdrawals = useCallback(() => {
    setError("");
    const params: Record<string, string | number> = { page, limit: 20 };
    if (status) params.status = status;
    if (search) params.search = search;
    Promise.all([
      api.get("/withdrawals", { params }),
      api.get("/withdrawals/summary", { params }),
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
        setError(loadError instanceof Error ? loadError.message : "تعذّر تحميل السحوبات");
      });
  }, [page, search, status]);

  useEffect(() => {
    api
      .get("/dashboard/earnings")
      .then((r) => setEarnings(r.data))
      .catch(() => setEarnings(null));
  }, []);

  useEffect(() => {
    void loadWithdrawals();
  }, [loadWithdrawals]);

  async function act(id: string, action: "approve" | "paid" | "reject") {
    setBusyId(id);
    setError("");
    try {
      await api.patch(`/withdrawals/${id}/${action}`, {});
      await loadWithdrawals();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "تعذّر تنفيذ الإجراء");
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Withdraw>[] = [
    { key: "name", header: "السائق", render: (w) => w.user?.name ?? "-" },
    { key: "phone", header: "الهاتف", render: (w) => w.user?.phone ?? "-" },
    { key: "amount", header: "المبلغ", render: (w) => money(w.amount) },
    {
      key: "status",
      header: "الحالة",
      render: (w) => <StatusBadge status={w.status} />,
    },
    {
      key: "createdAt",
      header: "التاريخ",
      render: (w) => dateTime(w.processedAt ?? w.createdAt),
    },
    {
      key: "note",
      header: "ملاحظة",
      render: (w) => w.note ?? "-",
    },
    {
      key: "actions",
      header: "إجراءات",
      render: (w) =>
        w.status === "PENDING" || w.status === "APPROVED" ? (
          <div className="flex gap-1">
            {w.status === "PENDING" ? (
              <button
                onClick={() => void act(w.id, "approve")}
                disabled={busyId === w.id}
                className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-500 disabled:opacity-50"
              >
                اعتماد
              </button>
            ) : null}
            <button
              onClick={() => void act(w.id, "paid")}
              disabled={busyId === w.id}
              className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-500 disabled:opacity-50"
            >
              دفع
            </button>
            <button
              onClick={() => void act(w.id, "reject")}
              disabled={busyId === w.id}
              className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-500 disabled:opacity-50"
            >
              رفض
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="الأرباح والسحوبات" />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="أرباح الشركة (الإجمالي)"
            value={money(earnings?.totalCompany)}
            icon={<DollarSign size={18} />}
            accent="brand"
          />
          <StatCard
            label="مدفوعات السائقين"
            value={money(earnings?.totalDriverPayouts)}
            icon={<Briefcase size={18} />}
            accent="blue"
          />
          <StatCard
            label="إيراد اليوم"
            value={money(earnings?.revenueToday)}
            icon={<TrendingUp size={18} />}
            accent="green"
          />
          <StatCard
            label="إيراد الأسبوع"
            value={money(earnings?.revenueWeek)}
            icon={<CalendarDays size={18} />}
            accent="amber"
          />
          <StatCard
            label="إيراد الشهر"
            value={money(earnings?.revenueMonth)}
            icon={<CalendarDays size={18} />}
            accent="brand"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="إجمالي الطلبات" value={num(summary?.totalCount)} icon={<Clock3 size={18} />} />
          <StatCard label="إجمالي قيمة السحب" value={money(summary?.totalAmount)} icon={<DollarSign size={18} />} accent="brand" />
          <StatCard label="قيد الانتظار" value={num(summary?.pendingCount)} icon={<Clock3 size={18} />} accent="amber" />
          <StatCard label="تم الدفع" value={num(summary?.paidCount)} icon={<CircleCheck size={18} />} accent="green" />
          <StatCard label="مرفوضة" value={num(summary?.rejectedCount)} icon={<CircleX size={18} />} accent="red" />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">طلبات السحب</h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s || "كل الحالات"}
                  </option>
                ))}
              </select>
              <input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="بحث بالسائق أو الهاتف"
                className="min-w-[220px] rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>

          {error ? <div className="text-sm text-red-500">{error}</div> : null}

          <DataTable columns={columns} rows={rows} />

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>الإجمالي: {num(total)}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
              >
                السابق
              </button>
              <span className="px-2 py-1">
                {page} / {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
