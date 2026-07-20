"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Route } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { money, num, dateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

interface Trip {
  id: string;
  status: string;
  fare?: number;
  paymentMethod?: string;
  cancellationFee?: number | null;
  cancellationSettledAt?: string | null;
  cancelledBy?: string | null;
  distanceKm?: number;
  createdAt: string;
  completedAt?: string | null;
  settledAt?: string | null;
  settlementAttempts: number;
  settlementError?: string | null;
  passenger?: { name: string; phone?: string };
  driver?: { user?: { name: string; phone?: string } };
}

const PAY_LABELS: Record<string, string> = {
  CASH: "نقدي",
  WALLET: "محفظة",
  CARD: "بطاقة",
};

const STATUSES = [
  "",
  "SEARCHING",
  "ACCEPTED",
  "ARRIVING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export default function TripsPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [unsettledOnly, setUnsettledOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const canManageTrips = can("trips.manage");

  const load = useCallback(() => {
    setError("");
    const params: Record<string, string | number | boolean> = {
      page,
      limit: 20,
    };
    if (status) params.status = status;
    if (search) params.search = search;
    if (unsettledOnly) params.unsettledOnly = true;
    api
      .get("/trips", { params })
      .then((r) => {
        setRows(r.data.items ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch((loadError) => {
        setRows([]);
        setTotal(0);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "تعذّر تحميل الرحلات",
        );
      });
  }, [page, search, status, unsettledOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(id: string, to: string) {
    if (!canManageTrips) return;
    setBusyId(id);
    setError("");
    try {
      await api.patch(`/trips/${id}/status`, { status: to });
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "تعذّر تحديث الحالة",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function retrySettlement(id: string) {
    if (!canManageTrips) return;
    setBusyId(id);
    setError("");
    try {
      await api.post(`/trips/${id}/retry-settlement`, {});
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "تعذّر إعادة المحاولة",
      );
    } finally {
      setBusyId(null);
    }
  }

  const completedTrips = useMemo(
    () => rows.filter((trip) => trip.status === "COMPLETED").length,
    [rows],
  );
  const unsettledTrips = useMemo(
    () =>
      rows.filter((trip) => trip.status === "COMPLETED" && !trip.settledAt)
        .length,
    [rows],
  );

  const columns: Column<Trip>[] = [
    {
      key: "id",
      header: "الرحلة",
      render: (t) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs">{t.id.slice(0, 8)}</span>
          <Link
            href={`/payments?search=${t.id}`}
            className="text-xs text-brand hover:underline"
          >
            ابحث في المدفوعات
          </Link>
        </div>
      ),
    },
    {
      key: "passenger",
      header: "الراكب",
      render: (t) => t.passenger?.name ?? "-",
    },
    {
      key: "driver",
      header: "السائق",
      render: (t) => t.driver?.user?.name ?? "-",
    },
    {
      key: "distance",
      header: "المسافة",
      render: (t) => (t.distanceKm ? `${t.distanceKm} كم` : "-"),
    },
    { key: "fare", header: "التكلفة", render: (t) => money(t.fare) },
    {
      key: "paymentMethod",
      header: "طريقة الدفع",
      render: (t) => (
        <span className="text-xs">
          {t.paymentMethod
            ? (PAY_LABELS[t.paymentMethod] ?? t.paymentMethod)
            : "-"}
        </span>
      ),
    },
    {
      key: "cancellationFee",
      header: "غرامة إلغاء السائق",
      render: (t) =>
        t.cancelledBy === "DRIVER" && t.cancellationFee
          ? `${money(t.cancellationFee)} ${t.cancellationSettledAt ? "(محسومة)" : "(قيد الحسم)"}`
          : "-",
    },
    {
      key: "status",
      header: "الحالة",
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: "settlement",
      header: "التسوية",
      render: (t) =>
        t.status !== "COMPLETED" ? (
          <span className="text-xs text-gray-500">-</span>
        ) : t.settledAt ? (
          <div className="flex flex-col text-xs text-green-600 dark:text-green-300">
            <span>تمت</span>
            <span>{dateTime(t.settledAt)}</span>
          </div>
        ) : (
          <div className="flex flex-col text-xs text-amber-600 dark:text-amber-300">
            <span>معلّقة</span>
            <span>محاولات: {num(t.settlementAttempts)}</span>
          </div>
        ),
    },
    {
      key: "createdAt",
      header: "الوقت",
      render: (t) => dateTime(t.completedAt ?? t.createdAt),
    },
    {
      key: "actions",
      header: "إجراءات",
      render: (t) => (
        <div className="flex flex-wrap gap-2">
          {canManageTrips && t.status !== "CANCELLED" ? (
            <button
              onClick={() => void changeStatus(t.id, "CANCELLED")}
              disabled={busyId === t.id}
              className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-500 disabled:opacity-50"
            >
              إلغاء
            </button>
          ) : null}
          {canManageTrips && t.status === "COMPLETED" && !t.settledAt ? (
            <button
              onClick={() => void retrySettlement(t.id)}
              disabled={busyId === t.id}
              className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-600 disabled:opacity-50 dark:text-amber-300"
            >
              إعادة التسوية
            </button>
          ) : null}
          {!canManageTrips ? (
            <span className="text-xs text-gray-400">عرض فقط</span>
          ) : null}
        </div>
      ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="الرحلات" />
      <div className="space-y-4 p-6">
        {!canManageTrips ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذا الدور يطالع الرحلات فقط. أوامر إلغاء الرحلة وإعادة التسوية متاحة
            فقط لمن لديهم صلاحية إدارة الرحلات.
          </div>
        ) : null}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
          يتحكّم السائق في دورة حياة الرحلة من التطبيق (وصل / بدء / إتمام /
          إلغاء) عبر واجهة REST مخصّصة، مع تسوية مالية تلقائية عند الإتمام
          وإشعارات Push فورية للراكب عند كل انتقال. تعكس هذه الصفحة الحالات
          الناتجة مباشرةً.
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
          يُسجَّل مسار السائق الحيّ (GPS) في قاعدة البيانات بشكل مُقنَّن أثناء
          الرحلات النشطة، ويُبثّ لحظيًّا إلى الراكب وإلى الخريطة الحية للمدير.
          يمكن استرجاع المسار الكامل لكل رحلة عند الحاجة.
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
          لا توجد أي رسوم إلغاء على الراكب. عند إلغاء السائق للرحلة تُحسم
          تلقائيًا غرامة من محفظة السائق = نسبة % من قيمة الرحلة الملغاة،
          والنسبة قابلة للضبط من لوحة التحكم عبر مفتاح الإعدادات
          trips.driverCancellationPenaltyPct (0 = معطّلة). تُسجّل الغرامة عبر
          دفتر الأستاذ (قيد مزدوج متوازن) مع حدث تدقيق.
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="إجمالي المعروض"
            value={num(total)}
            icon={<Route size={18} />}
          />
          <StatCard
            label="المكتملة في الصفحة"
            value={num(completedTrips)}
            icon={<CheckCircle2 size={18} />}
            accent="green"
          />
          <StatCard
            label="معلّقة التسوية"
            value={num(unsettledTrips)}
            icon={<AlertTriangle size={18} />}
            accent="amber"
          />
        </div>

        <div className="flex flex-wrap gap-3">
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
            placeholder="بحث بالراكب أو السائق أو الرحلة"
            className="min-w-[260px] rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={unsettledOnly}
              onChange={(event) => {
                setPage(1);
                setUnsettledOnly(event.target.checked);
              }}
            />
            الرحلات غير المسوّاة فقط
          </label>
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
    </>
  );
}
