"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, RefreshCcw, Search, Wallet } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { api, getApiErrorMessage } from "@/lib/api";
import { money, num } from "@/lib/format";

interface Account {
  id: string;
  code: string;
  type: string;
  currency: string;
  balanceCache: number;
  isActive: boolean;
  party: {
    displayName: string;
    type: string;
  };
}

export default function WalletsPage() {
  const [rows, setRows] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get("/financial/accounts", {
        params: { page, limit: 20, search: search.trim() || undefined },
      })
      .then((response) => {
        setRows(response.data.items ?? []);
        setTotal(response.data.total ?? 0);
      })
      .catch((loadError) => {
        setRows([]);
        setTotal(0);
        setError(getApiErrorMessage(loadError, "تعذّر تحميل الحسابات المالية"));
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeOnPage = useMemo(
    () => rows.filter((account) => account.isActive).length,
    [rows],
  );

  const columns: Column<Account>[] = [
    {
      key: "party",
      header: "الطرف",
      render: (account) => (
        <div>
          <div className="font-bold">{account.party.displayName}</div>
          <div className="text-xs text-slate-400">{account.party.type}</div>
        </div>
      ),
    },
    {
      key: "code",
      header: "رمز الحساب",
      render: (account) => (
        <span className="font-mono text-xs">{account.code}</span>
      ),
    },
    { key: "type", header: "التصنيف" },
    { key: "currency", header: "العملة" },
    {
      key: "balance",
      header: "الرصيد المشتق",
      render: (account) => (
        <span
          className={
            account.balanceCache < 0
              ? "font-bold text-red-600"
              : "font-bold text-slate-900 dark:text-white"
          }
        >
          {money(account.balanceCache, account.currency)}
        </span>
      ),
    },
    {
      key: "state",
      header: "الحالة",
      render: (account) => (
        <span
          className={
            account.isActive
              ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600"
              : "rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-bold text-slate-500"
          }
        >
          {account.isActive ? "نشط" : "متوقف"}
        </span>
      ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar
        title="الحسابات المالية"
        subtitle="عرض حسابات دفتر الأستاذ والأرصدة المشتقة"
      />
      <div className="space-y-6 p-4 sm:p-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="إجمالي الحسابات"
            value={num(total)}
            icon={<BookOpen size={18} />}
          />
          <StatCard
            label="المعروض في الصفحة"
            value={num(rows.length)}
            icon={<Wallet size={18} />}
            accent="blue"
          />
          <StatCard
            label="حسابات نشطة معروضة"
            value={num(activeOnPage)}
            icon={<Wallet size={18} />}
            accent="green"
          />
        </section>

        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="relative min-w-64 flex-1 sm:max-w-md">
            <Search
              size={17}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="بحث بالطرف أو رمز الحساب"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-10 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />{" "}
            تحديث
          </button>
        </section>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </div>
        ) : null}

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          empty="لا توجد حسابات مالية مطابقة"
        />

        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>الإجمالي: {num(total)}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
            >
              السابق
            </button>
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-bold dark:bg-gray-800">
              {page} / {pages}
            </span>
            <button
              disabled={page >= pages || loading}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
            >
              التالي
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
