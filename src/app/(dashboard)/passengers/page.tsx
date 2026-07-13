"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { num, dateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

interface Passenger {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  createdAt: string;
}

export default function PassengersPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Passenger[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    const params: Record<string, string | number> = { page, limit: 20 };
    if (search) params.search = search;
    api
      .get("/passengers", { params })
      .then((r) => {
        setRows(r.data.items ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => {});
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: string) {
    if (!can("passengers.manage")) return;
    await api.patch(`/passengers/${id}/${action}`);
    load();
  }

  const canManagePassengers = can("passengers.manage");

  const columns: Column<Passenger>[] = [
    { key: "name", header: "الاسم" },
    { key: "phone", header: "الهاتف" },
    { key: "email", header: "البريد", render: (p) => p.email ?? "-" },
    {
      key: "status",
      header: "الحالة",
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "createdAt",
      header: "انضم في",
      render: (p) => dateTime(p.createdAt),
    },
    {
      key: "actions",
      header: "إجراءات",
      render: (p) => (
        <div className="flex gap-1">
          {canManagePassengers ? (
            <>
              <button
                onClick={() => act(p.id, "activate")}
                className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-500"
              >
                تفعيل
              </button>
              <button
                onClick={() => act(p.id, "suspend")}
                className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-500"
              >
                تعليق
              </button>
              <button
                onClick={() => act(p.id, "ban")}
                className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-500"
              >
                حظر
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="إدارة الركاب" />
      <div className="space-y-4 p-6">
        {!canManagePassengers ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذه الصفحة في وضع القراءة فقط. إجراءات التفعيل والتعليق والحظر متاحة فقط لمن لديهم صلاحية إدارة الركاب.
          </div>
        ) : null}

        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="بحث بالاسم أو الهاتف..."
          className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
        />
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
