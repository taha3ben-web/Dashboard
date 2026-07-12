"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { api } from "@/lib/api";
import { dateTime, money, num } from "@/lib/format";

interface LedgerEntryRow {
  id: string;
  direction: "DEBIT" | "CREDIT";
  amount: number;
  account: {
    code: string;
    party?: { displayName?: string } | null;
  };
}

interface LedgerTransactionRow {
  id: string;
  command: string;
  status: string;
  currency: string;
  referenceType?: string | null;
  referenceId?: string | null;
  idempotencyKey: string;
  createdAt: string;
  postedAt?: string | null;
  entries: LedgerEntryRow[];
}

const STATUS_OPTIONS = ["", "PENDING", "POSTED", "FAILED", "REVERSED", "CANCELLED"];
const REFERENCE_TYPES = [
  "",
  "PAYMENT",
  "TRIP",
  "WITHDRAWAL",
  "DRIVER_FUNDING",
  "DRIVER_TRANSFER",
];

export default function FinancialTransactionsPage() {
  const [rows, setRows] = useState<LedgerTransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [referenceType, setReferenceType] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    api
      .get("/financial/transactions", {
        params: {
          page,
          limit: 20,
          status: status || undefined,
          referenceType: referenceType || undefined,
          search: search || undefined,
        },
      })
      .then((response) => {
        setRows(response.data.items ?? []);
        setTotal(response.data.total ?? 0);
      })
      .catch((loadError) => {
        setRows([]);
        setTotal(0);
        setError(
          loadError instanceof Error ? loadError.message : "تعذّر تحميل القيود المالية",
        );
      });
  }, [page, referenceType, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<Column<LedgerTransactionRow>[]>(
    () => [
      {
        key: "command",
        header: "الأمر",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.command}</span>
            <span className="font-mono text-xs text-gray-500">{row.id.slice(0, 8)}</span>
          </div>
        ),
      },
      {
        key: "reference",
        header: "المرجع",
        render: (row) => (
          <div className="flex flex-col">
            <span>{row.referenceType ?? "-"}</span>
            <span className="font-mono text-xs text-gray-500">{row.referenceId ?? "-"}</span>
          </div>
        ),
      },
      {
        key: "status",
        header: "الحالة",
      },
      {
        key: "entries",
        header: "القيود",
        render: (row) => (
          <div className="space-y-1 text-xs">
            {row.entries.slice(0, 3).map((entry) => (
              <div key={entry.id}>
                <span className="font-medium">{entry.direction === "DEBIT" ? "مدين" : "دائن"}</span>
                {" · "}
                <span>{entry.account.code}</span>
                {" · "}
                <span>{money(entry.amount)}</span>
              </div>
            ))}
            {row.entries.length > 3 ? (
              <div className="text-gray-500">+{row.entries.length - 3} قيود إضافية</div>
            ) : null}
          </div>
        ),
      },
      {
        key: "postedAt",
        header: "التاريخ",
        render: (row) => dateTime(row.postedAt ?? row.createdAt),
      },
    ],
    [],
  );

  return (
    <>
      <Topbar title="قيود الدفتر المالي" />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-3">
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value || "all-status"} value={value}>
                {value || "كل الحالات"}
              </option>
            ))}
          </select>
          <select
            value={referenceType}
            onChange={(event) => {
              setPage(1);
              setReferenceType(event.target.value);
            }}
            className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
          >
            {REFERENCE_TYPES.map((value) => (
              <option key={value || "all-reference"} value={value}>
                {value || "كل المراجع"}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="بحث بالأمر أو المرجع أو idempotency"
            className="min-w-[280px] rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
          />
        </div>

        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <DataTable columns={columns} rows={rows} empty="لا توجد قيود مطابقة" />

        <div className="flex justify-between text-sm text-gray-500">
          <span>الإجمالي: {num(total)}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
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
