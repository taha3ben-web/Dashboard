"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { money, num, dateTime } from "@/lib/format";

interface Trip {
  id: string;
  status: string;
  fare?: number;
  distanceKm?: number;
  createdAt: string;
  passenger?: { name: string };
  driver?: { user?: { name: string } };
}

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
  const [rows, setRows] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    const params: Record<string, string | number> = { page, limit: 20 };
    if (status) params.status = status;
    api
      .get("/trips", { params })
      .then((r) => {
        setRows(r.data.items ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => {});
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: string, to: string) {
    await api.patch(`/trips/${id}/status`, { status: to });
    load();
  }

  const columns: Column<Trip>[] = [
    { key: "id", header: "رقم", render: (t) => t.id.slice(0, 8) },
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
      key: "status",
      header: "الحالة",
      render: (t) => <StatusBadge status={t.status} />,
    },
    { key: "createdAt", header: "الوقت", render: (t) => dateTime(t.createdAt) },
    {
      key: "actions",
      header: "تغيير الحالة",
      render: (t) => (
        <button
          onClick={() => changeStatus(t.id, "CANCELLED")}
          className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-500"
        >
          إلغاء
        </button>
      ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="الرحلات" />
      <div className="space-y-4 p-6">
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
