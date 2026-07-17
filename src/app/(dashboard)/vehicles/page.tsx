"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, Column } from "@/components/DataTable";
import { api } from "@/lib/api";
import { num, dateTime } from "@/lib/format";
import { Check, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

type Status = "PENDING" | "APPROVED" | "REJECTED";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year?: number | null;
  color?: string | null;
  plate: string;
  rideClass: string;
  isActive: boolean;
  verificationStatus: Status;
  verificationNote?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  driver?: {
    id: string;
    user?: { name?: string | null; phone?: string | null } | null;
  } | null;
}

const STATUS_LABEL: Record<Status, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "موثّقة",
  REJECTED: "مرفوضة",
};

const STATUS_FILTERS: Array<{ value: "" | Status; label: string }> = [
  { value: "", label: "الكل" },
  { value: "PENDING", label: "قيد المراجعة" },
  { value: "APPROVED", label: "موثّقة" },
  { value: "REJECTED", label: "مرفوضة" },
];

export default function VehiclesPage() {
  const { can } = useAuth();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | Status>("PENDING");
  const [busy, setBusy] = useState<string | null>(null);
  const canManage = can("drivers.manage");

  const load = useCallback(() => {
    const params: Record<string, unknown> = { page, limit: 20 };
    if (status) params.status = status;
    api
      .get("/vehicles", { params })
      .then((r) => {
        setItems(r.data.items ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => {});
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(v: Vehicle, target: "APPROVED" | "REJECTED") {
    if (!canManage || busy) return;
    let note: string | undefined;
    if (target === "REJECTED") {
      const raw = window.prompt("سبب الرفض (يظهر للسائق):", "");
      if (raw === null) return;
      note = raw.trim() || undefined;
    }
    setBusy(v.id);
    try {
      await api.patch(`/vehicles/${v.id}/verify`, { status: target, note });
      load();
    } catch {
      /* يُعرض الخطأ عبر المعترض العام */
    } finally {
      setBusy(null);
    }
  }

  const columns: Column<Vehicle>[] = [
    {
      key: "driver",
      header: "السائق",
      render: (v) => (
        <div>
          <div className="font-medium">{v.driver?.user?.name ?? "-"}</div>
          <div className="text-xs text-gray-400">{v.driver?.user?.phone}</div>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "المركبة",
      render: (v) => (
        <div>
          <div className="font-medium">
            {v.make} {v.model}
            {v.year ? ` · ${v.year}` : ""}
          </div>
          <div className="text-xs text-gray-400">{v.color ?? ""}</div>
        </div>
      ),
    },
    { key: "plate", header: "لوحة التسجيل", render: (v) => v.plate },
    { key: "rideClass", header: "الفئة", render: (v) => v.rideClass },
    {
      key: "active",
      header: "مفعّلة",
      render: (v) => (v.isActive ? "نعم" : "لا"),
    },
    {
      key: "status",
      header: "التحقق",
      render: (v) => STATUS_LABEL[v.verificationStatus] ?? v.verificationStatus,
    },
    {
      key: "createdAt",
      header: "أُضيفت",
      render: (v) => dateTime(v.createdAt),
    },
    {
      key: "actions",
      header: "إجراءات",
      render: (v) =>
        canManage ? (
          <div className="flex gap-2">
            <button
              onClick={() => review(v, "APPROVED")}
              disabled={busy === v.id || v.verificationStatus === "APPROVED"}
              className="flex items-center gap-1 rounded bg-green-500/10 px-2 py-1 text-xs text-green-600 disabled:opacity-40"
            >
              <Check size={14} /> اعتماد
            </button>
            <button
              onClick={() => review(v, "REJECTED")}
              disabled={busy === v.id || v.verificationStatus === "REJECTED"}
              className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-xs text-red-600 disabled:opacity-40"
            >
              <X size={14} /> رفض
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
      <Topbar title="تحقق المركبات" />
      <div className="space-y-6 p-6">
        {!canManage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذه الصفحة للقراءة فقط. الاعتماد أو الرفض يتطلّب صلاحية إدارة السائقين.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || "ALL"}
              onClick={() => {
                setPage(1);
                setStatus(f.value);
              }}
              className={
                status === f.value
                  ? "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div>
          <DataTable columns={columns} rows={items} />
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
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
