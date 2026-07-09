"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { num } from "@/lib/format";

interface Driver {
  id: string;
  status: string;
  rating: number;
  totalTrips: number;
  user?: { name: string; phone: string };
  city?: { name: string };
}

const STATUSES = ["", "PENDING", "APPROVED", "SUSPENDED", "REJECTED", "BANNED"];

export default function DriversPage() {
  const [rows, setRows] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    const params: Record<string, string | number> = { page, limit: 20 };
    if (search) params.search = search;
    if (status) params.status = status;
    api
      .get("/drivers", { params })
      .then((r) => {
        setRows(r.data.items ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => {});
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: string) {
    await api.patch(`/drivers/${id}/${action}`);
    load();
  }

  const columns: Column<Driver>[] = [
    { key: "name", header: "الاسم", render: (d) => d.user?.name ?? "-" },
    { key: "phone", header: "الهاتف", render: (d) => d.user?.phone ?? "-" },
    { key: "city", header: "المدينة", render: (d) => d.city?.name ?? "-" },
    { key: "rating", header: "التقييم", render: (d) => d.rating?.toFixed(1) },
    { key: "totalTrips", header: "الرحلات", render: (d) => num(d.totalTrips) },
    {
      key: "status",
      header: "الحالة",
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      key: "actions",
      header: "إجراءات",
      render: (d) => (
        <div className="flex gap-1">
          <button
            onClick={() => act(d.id, "approve")}
            className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-500"
          >
            قبول
          </button>
          <button
            onClick={() => act(d.id, "reject")}
            className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-500"
          >
            رفض
          </button>
          <button
            onClick={() => act(d.id, "suspend")}
            className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-500"
          >
            تعليق
          </button>
          <button
            onClick={() => act(d.id, "ban")}
            className="rounded bg-gray-500/10 px-2 py-1 text-xs text-gray-500"
          >
            حظر
          </button>
        </div>
      ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="إدارة السائقين" />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="بحث بالاسم أو الهاتف..."
            className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
          />
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
        </div>

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
