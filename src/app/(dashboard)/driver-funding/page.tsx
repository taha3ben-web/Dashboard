"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, money, num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

interface FundingRow {
  id: string;
  amount: number;
  status: string;
  note?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  fundedAt?: string | null;
  idempotencyKey: string;
  driver: { user: { name: string; phone: string; status: string } };
  requestedBy: { name: string; phone: string; type: string };
  approvedBy?: { name: string } | null;
}

interface DriverOption {
  id: string;
  user?: { name: string; phone: string };
}

const STATUSES = ["", "PENDING", "APPROVED", "REJECTED", "FUNDED"];

export default function DriverFundingPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<FundingRow[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [driverId, setDriverId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const canManageFunding = can("funding.manage");

  const load = useCallback(() => {
    setError("");
    api
      .get("/driver-funding/requests", {
        params: { page, limit: 20, status: status || undefined, search: search || undefined },
      })
      .then((response) => {
        setRows(response.data.items ?? []);
        setTotal(response.data.total ?? 0);
      })
      .catch((loadError) => {
        setRows([]);
        setTotal(0);
        setError(getApiErrorMessage(loadError, "تعذّر تحميل طلبات شحن السائقين"));
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

  async function createRequest() {
    if (!canManageFunding) return;
    try {
      await api.post("/driver-funding/requests", {
        driverId,
        amount: Number(amount),
        note: note || undefined,
      });
      setDriverId("");
      setAmount("");
      setNote("");
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنشاء طلب الشحن"));
    }
  }

  async function process(id: string, action: "approve" | "reject" | "fund") {
    if (!canManageFunding) return;
    const actionNote = window.prompt("ملاحظة العملية:") ?? undefined;
    try {
      await api[action === "fund" ? "post" : "patch"](`/driver-funding/requests/${id}/${action}`, { note: actionNote });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تنفيذ العملية"));
    }
  }

  const columns: Column<FundingRow>[] = [
    {
      key: "driver",
      header: "السائق",
      render: (row) => (
        <div>
          <div className="font-medium">{row.driver.user.name}</div>
          <div className="text-xs text-gray-500">{row.driver.user.phone}</div>
        </div>
      ),
    },
    { key: "amount", header: "المبلغ", render: (row) => money(row.amount) },
    { key: "status", header: "الحالة", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "requestedBy",
      header: "الطالب",
      render: (row) => (
        <div>
          <div>{row.requestedBy.name}</div>
          <div className="text-xs text-gray-500">{row.requestedBy.type}</div>
        </div>
      ),
    },
    { key: "note", header: "الملاحظة", render: (row) => row.note ?? "-" },
    { key: "createdAt", header: "الإنشاء", render: (row) => dateTime(row.createdAt) },
    {
      key: "actions",
      header: "الإجراء",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {canManageFunding ? (
            <>
              <button
                disabled={row.status !== "PENDING"}
                onClick={() => void process(row.id, "approve")}
                className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600 disabled:opacity-30"
              >
                اعتماد
              </button>
              <button
                disabled={row.status === "FUNDED" || row.status === "REJECTED"}
                onClick={() => void process(row.id, "reject")}
                className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600 disabled:opacity-30"
              >
                رفض
              </button>
              <button
                disabled={row.status !== "APPROVED"}
                onClick={() => void process(row.id, "fund")}
                className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-600 disabled:opacity-30"
              >
                تم الشحن
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
      <Topbar title="شحن السائقين" />
      <div className="space-y-4 p-6">
        {!canManageFunding ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذه الصفحة معروضة للقراءة فقط. إنشاء الطلبات ومعالجة الشحن متاحان فقط لمن لديهم صلاحية إدارة التمويل.
          </div>
        ) : null}

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Wallet size={18} />
            <span className="font-medium">تشغيل طلبات شحن محافظ السائقين من لوحة التحكم</span>
          </div>
          <div className="mt-1 text-sm text-blue-700/80 dark:text-blue-300/80">الإجمالي الحالي: {num(total)}</div>
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
            placeholder="بحث بالسائق أو الهاتف أو المرجع"
            className="min-w-72 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        {canManageFunding ? (
          <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-4">
            <select value={driverId} onChange={(event) => setDriverId(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
              <option value="">اختر السائق</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.user?.name ?? driver.id} · {driver.user?.phone ?? "-"}</option>
              ))}
            </select>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="المبلغ" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="ملاحظة (اختياري)" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
            <button onClick={() => void createRequest()} disabled={!driverId || !amount} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">إنشاء طلب شحن</button>
          </div>
        ) : null}

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <DataTable columns={columns} rows={rows} empty="لا توجد طلبات شحن" />

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
