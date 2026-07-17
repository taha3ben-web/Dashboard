"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { num } from "@/lib/format";

interface Row {
  driverId: string;
  name: string | null;
  phone: string | null;
  trips: number;
  netEarnings: number;
  grossEarnings: number;
  commission: number;
  paid: number;
  pending: number;
  rejected: number;
  available: number;
  gap: number;
  flags: string[];
}
interface Totals {
  drivers: number;
  netEarnings: number;
  paid: number;
  pending: number;
  available: number;
  flagged: number;
}
interface Data {
  totals: Totals;
  items: Row[];
}

const FLAG_LABEL: Record<string, string> = {
  PAID_EXCEEDS_EARNED: "مسحوب يتجاوز الأرباح",
  NEGATIVE_AVAILABLE: "رصيد متاح سالب",
  WITHDRAW_WITHOUT_EARNINGS: "سحب بلا أرباح",
};
const AUTO_REFRESH_MS = 30000;

export default function PayoutIntegrityPage() {
  const [data, setData] = useState<Data | null>(null);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
    code?: string;
  } | null>(null);

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const res = await api.get("/withdrawals/payout-integrity", {
        params: { limit: 100 },
      });
      setData(res.data ?? null);
      if (manual) setNotice({ kind: "success", text: "تم تحديث نزاهة الدفعات." });
    } catch (e) {
      setNotice({
        kind: "error",
        text: getApiErrorMessage(e, "تعذّر تحميل نزاهة الدفعات"),
        code: getApiErrorCode(e),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), AUTO_REFRESH_MS);
    return () => window.clearInterval(t);
  }, [load]);

  const items = (data?.items ?? []).filter(
    (r) => !onlyFlagged || r.flags.length > 0,
  );

  return (
    <>
      <Topbar title="Driver Earnings & Payout Integrity" />
      <main className="space-y-5 p-4 sm:p-6">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Stage 44 · Financial Ops
            </p>
            <h1 className="mt-1 text-2xl font-bold">نزاهة أرباح السائقين والدفعات</h1>
            <p className="mt-1 text-sm text-slate-500">
              مطابقة صافي الأرباح مع المسحوب والمعلّق لكل سائق — قراءة فقط.
            </p>
          </div>
          <button
            onClick={() => void load(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            تحديث
          </button>
        </section>

        {notice ? (
          <div
            className={`flex gap-2 rounded-xl border p-4 text-sm ${
              notice.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {notice.kind === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
            <div>
              {notice.text}
              {notice.code ? (
                <div className="font-mono text-xs">code: {notice.code}</div>
              ) : null}
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="سائقون" value={num(data?.totals.drivers)} />
          <Metric label="صافي الأرباح" value={num(data?.totals.netEarnings)} />
          <Metric label="المدفوع فعليًا" value={num(data?.totals.paid)} />
          <Metric label="معلّق (قيد التنفيذ)" value={num(data?.totals.pending)} />
          <Metric
            label="سائقون مُعلّمون"
            value={num(data?.totals.flagged)}
            warn={(data?.totals.flagged ?? 0) > 0}
          />
        </section>

        <section className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyFlagged}
                onChange={(e) => setOnlyFlagged(e.target.checked)}
              />
              المُعلّمون فقط
            </label>
            <Link
              href="/withdrawals"
              className="ml-auto rounded-xl border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              طلبات السحب
            </Link>
            <Link
              href="/earnings"
              className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              الأرباح
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-right text-xs text-slate-400">
                <tr>
                  <th className="p-2">السائق</th>
                  <th className="p-2">رحلات</th>
                  <th className="p-2">صافي الأرباح</th>
                  <th className="p-2">مدفوع</th>
                  <th className="p-2">معلّق</th>
                  <th className="p-2">متاح</th>
                  <th className="p-2">الفجوة</th>
                  <th className="p-2">إشارات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr
                    key={r.driverId}
                    className={`border-t dark:border-gray-800 ${
                      r.flags.length ? "bg-red-50/60 dark:bg-red-950/10" : ""
                    }`}
                  >
                    <td className="p-2">
                      <div className="font-semibold">{r.name ?? "—"}</div>
                      <div className="text-xs text-slate-400">
                        {r.phone ?? r.driverId.slice(0, 8)}
                      </div>
                    </td>
                    <td className="p-2">{num(r.trips)}</td>
                    <td className="p-2 font-semibold">{num(r.netEarnings)}</td>
                    <td className="p-2">{num(r.paid)}</td>
                    <td className="p-2 text-amber-600">{num(r.pending)}</td>
                    <td
                      className={`p-2 ${
                        r.available < 0 ? "font-bold text-red-600" : ""
                      }`}
                    >
                      {num(r.available)}
                    </td>
                    <td
                      className={`p-2 ${
                        Math.abs(r.gap) > 0.005 ? "text-indigo-600" : ""
                      }`}
                    >
                      {num(r.gap)}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {r.flags.map((f) => (
                          <span
                            key={f}
                            className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700"
                          >
                            {FLAG_LABEL[f] ?? f}
                          </span>
                        ))}
                        {!r.flags.length ? (
                          <span className="text-xs text-emerald-600">✓ متوازن</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !items.length ? (
              <p className="p-3 text-sm text-slate-500">لا توجد بيانات مطابقة.</p>
            ) : null}
            {loading ? (
              <p className="p-3 text-sm text-slate-500">جارٍ التحميل...</p>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {warn ? (
        <AlertTriangle className="text-red-600" />
      ) : (
        <Wallet className="text-indigo-600" />
      )}
      <div className="mt-3 text-xl font-black">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}
