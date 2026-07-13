"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, money, num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

interface TransferRow {
  id: string;
  amount: number;
  status: string;
  note?: string | null;
  riskFlags?: string[] | null;
  createdAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
  fromDriver: { user: { name: string; phone: string }; city?: { name?: string } | null };
  toDriver: { user: { name: string; phone: string }; city?: { name?: string } | null };
  requestedBy: { name: string; type: string };
  reviewedBy?: { name: string } | null;
}

interface DriverOption {
  id: string;
  user?: { name: string; phone: string };
}

const STATUSES = ["", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];

export default function DriverTransfersPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [fromDriverId, setFromDriverId] = useState("");
  const [toDriverId, setToDriverId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const canManageTransfers = can("transfer.manage");

  const load = useCallback(() => {
    setError("");
    api
      .get("/driver-transfers", {
        params: { page, limit: 20, status: status || undefined, search: search || undefined },
      })
      .then((response) => {
        setRows(response.data.items ?? []);
        setTotal(response.data.total ?? 0);
      })
      .catch((loadError) => {
        setRows([]);
        setTotal(0);
        setError(getApiErrorMessage(loadError, "تعذّر تحميل تحويلات السائقين"));
      });
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api
      .get("/drivers", { params: { page: 1, limit: 100, status: "APPROVED" } })
      .then((response) => setDrivers(response.data.items ?? []))
      .catch(() => setDrivers([]));
  }, []);

  async function createTransfer() {
    if (!canManageTransfers) return;
    try {
      await api.post("/driver-transfers", {
        fromDriverId,
        toDriverId,
        amount: Number(amount),
        note: note || undefined,
      });
      setFromDriverId("");
      setToDriverId("");
      setAmount("");
      setNote("");
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنشاء التحويل"));
    }
  }

  async function process(id: string, action: "approve" | "reject" | "complete") {
    if (!canManageTransfers) return;
    const actionNote = window.prompt("ملاحظة العملية:") ?? undefined;
    try {
      await api[action === "complete" ? "post" : "patch"](`/driver-transfers/${id}/${action}`, { note: actionNote });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تنفيذ العملية"));
    }
  }

  const columns: Column<TransferRow>[] = [
    {
      key: "route",
      header: "من ← إلى",
      render: (row) => (
        <div>
          <div className="font-medium">{row.fromDriver.user.name} ← {row.toDriver.user.name}</div>
          <div className="text-xs text-gray-500">{row.fromDriver.user.phone} → {row.toDriver.user.phone}</div>
        </div>
      ),
    },
    { key: "amount", header: "المبلغ", render: (row) => money(row.amount) },
    { key: "status", header: "الحالة", render: (row) => <StatusBadge status={row.status} /> },
    { key: "riskFlags", header: "رايات المخاطر", render: (row) => row.riskFlags?.length ? row.riskFlags.join("، ") : "-" },
    { key: "requestedBy", header: "الطالب", render: (row) => `${row.requestedBy.name} · ${row.requestedBy.type}` },
    { key: "createdAt", header: "الإنشاء", render: (row) => dateTime(row.createdAt) },
    {
      key: "actions",
      header: "الإجراء",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {canManageTransfers ? (
            <>
              <button
                disabled={row.status !== "PENDING"}
                onClick={() => void process(row.id, "approve")}
                className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600 disabled:opacity-30"
              >
                اعتماد
              </button>
              <button
                disabled={row.status === "COMPLETED" || row.status === "REJECTED"}
                onClick={() => void process(row.id, "reject")}
                className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600 disabled:opacity-30"
              >
                رفض
              </button>
              <button
                disabled={row.status !== "APPROVED"}
                onClick={() => void process(row.id, "complete")}
                className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-600 disabled:opacity-30"
              >
                تنفيذ
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
      <Topbar title="تحويلات السائقين" />
      <div className="space-y-4 p-6">
        {!canManageTransfers ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            لديك عرض فقط لهذه الصفحة. إنشاء التحويلات واعتمادها وتنفيذها مخفيان بحسب الصلاحيات.
          </div>
        ) : null}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <ArrowRightLeft size={18} />
            <span className="font-medium">إدارة تحويلات الرصيد بين السائقين من مركز التشغيل</span>
          </div>
          <div className="mt-1 text-sm text-amber-700/80 dark:text-amber-300/80">الإجمالي الحالي: {num(total)}</div>
        </div>

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
            placeholder="بحث بالسائقين أو الهاتف أو المرجع"
            className="min-w-72 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        {canManageTransfers ? (
          <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-5">
            <select value={fromDriverId} onChange={(event) => setFromDriverId(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
              <option value="">من السائق</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.user?.name ?? driver.id} · {driver.user?.phone ?? "-"}</option>
              ))}
            </select>
            <select value={toDriverId} onChange={(event) => setToDriverId(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
              <option value="">إلى السائق</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.user?.name ?? driver.id} · {driver.user?.phone ?? "-"}</option>
              ))}
            </select>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="المبلغ" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="ملاحظة (اختياري)" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
            <button onClick={() => void createTransfer()} disabled={!fromDriverId || !toDriverId || !amount || fromDriverId === toDriverId} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">إنشاء تحويل</button>
          </div>
        ) : null}

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <DataTable columns={columns} rows={rows} empty="لا توجد تحويلات سائقين" />

        <div className="flex justify-between text-sm text-gray-500">
          <span>الإجمالي: {num(total)}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>السابق</button>
            <span>{page}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage((value) => value + 1)}>التالي</button>
          </div>
        </div>
      </div>
    </>
  );
}
