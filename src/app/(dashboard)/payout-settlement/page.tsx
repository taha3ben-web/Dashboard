"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  HandCoins,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { num } from "@/lib/format";

type Recommendation = "APPROVE" | "PAY" | "HOLD_INSUFFICIENT" | "REVIEW_RISK";
interface Item {
  id: string;
  driverId: string;
  name: string | null;
  phone: string | null;
  status: string;
  amount: number;
  backedAmount: number;
  shortfall: number;
  recommendation: Recommendation;
  flags: string[];
}
interface Totals {
  requests: number;
  drivers: number;
  totalAmount: number;
  readyToApprove: number;
  readyToApproveAmount: number;
  readyToPay: number;
  readyToPayAmount: number;
  hold: number;
  holdAmount: number;
  review: number;
  reviewAmount: number;
}
interface Data {
  totals: Totals;
  items: Item[];
}

const REC_LABEL: Record<Recommendation, string> = {
  APPROVE: "جاهز للاعتماد",
  PAY: "جاهز للدفع",
  REVIEW_RISK: "مراجعة مخاطر",
  HOLD_INSUFFICIENT: "رصيد غير كافٍ",
};
const REC_STYLE: Record<Recommendation, string> = {
  APPROVE: "bg-indigo-100 text-indigo-700",
  PAY: "bg-emerald-100 text-emerald-700",
  REVIEW_RISK: "bg-amber-100 text-amber-700",
  HOLD_INSUFFICIENT: "bg-red-100 text-red-700",
};
const FLAG_LABEL: Record<string, string> = {
  INSUFFICIENT_FUNDS: "تغطية ناقصة",
  DRIVER_RISK: "سائق مُعرّض للمخاطر",
};
const AUTO_REFRESH_MS = 30000;

export default function PayoutSettlementPage() {
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState<"ALL" | "READY" | "BLOCKED">("ALL");
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
      const res = await api.get("/withdrawals/settlement-proposal", {
        params: { limit: 150 },
      });
      setData(res.data ?? null);
      if (manual) setNotice({ kind: "success", text: "تم تحديث مُقترح التسوية." });
    } catch (e) {
      setNotice({
        kind: "error",
        text: getApiErrorMessage(e, "تعذّر تحميل مُقترح التسوية"),
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

  const items = (data?.items ?? []).filter((r) => {
    if (filter === "READY")
      return r.recommendation === "APPROVE" || r.recommendation === "PAY";
    if (filter === "BLOCKED")
      return (
        r.recommendation === "HOLD_INSUFFICIENT" ||
        r.recommendation === "REVIEW_RISK"
      );
    return true;
  });

  return (
    <>
      <Topbar title="Driver Payout Settlement" />
      <main className="space-y-5 p-4 sm:p-6">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Stage 45 · Financial Ops
            </p>
            <h1 className="mt-1 text-2xl font-bold">تسوية دفعات السائقين</h1>
            <p className="mt-1 text-sm text-slate-500">
              دفعة مقترحة للسحوبات قيد التنفيذ مدعومة بصافي الأرباح —
              قراءة فقط؛ التنفيذ عبر الاعتماد/الدفع.
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
          <Metric label="طلبات قيد التنفيذ" value={num(data?.totals.requests)} />
          <Metric label="إجمالي المبلغ" value={num(data?.totals.totalAmount)} />
          <Metric
            label="جاهز للاعتماد"
            value={`${num(data?.totals.readyToApprove)} · ${num(data?.totals.readyToApproveAmount)}`}
          />
          <Metric
            label="جاهز للدفع"
            value={`${num(data?.totals.readyToPay)} · ${num(data?.totals.readyToPayAmount)}`}
          />
          <Metric
            label="محجوز/مراجعة"
            value={num((data?.totals.hold ?? 0) + (data?.totals.review ?? 0))}
            warn={((data?.totals.hold ?? 0) + (data?.totals.review ?? 0)) > 0}
          />
        </section>

        <section className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-xl border p-1 dark:border-gray-700">
              {([
                ["ALL", "الكل"],
                ["READY", "جاهز"],
                ["BLOCKED", "محجوز"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                    filter === key
                      ? "bg-brand text-white"
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Link
              href="/payout-integrity"
              className="ml-auto rounded-xl border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              نزاهة الدفعات
            </Link>
            <Link
              href="/withdrawals"
              className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              طلبات السحب
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-right text-xs text-slate-400">
                <tr>
                  <th className="p-2">السائق</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">المبلغ</th>
                  <th className="p-2">المُغطّى</th>
                  <th className="p-2">العجز</th>
                  <th className="p-2">التوصية</th>
                  <th className="p-2">إشارات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t dark:border-gray-800 ${
                      r.flags.length ? "bg-red-50/40 dark:bg-red-950/10" : ""
                    }`}
                  >
                    <td className="p-2">
                      <div className="font-semibold">{r.name ?? "—"}</div>
                      <div className="text-xs text-slate-400">
                        {r.phone ?? r.driverId.slice(0, 8)}
                      </div>
                    </td>
                    <td className="p-2 text-xs">{r.status}</td>
                    <td className="p-2 font-semibold">{num(r.amount)}</td>
                    <td className="p-2">{num(r.backedAmount)}</td>
                    <td
                      className={`p-2 ${
                        r.shortfall > 0 ? "font-bold text-red-600" : ""
                      }`}
                    >
                      {num(r.shortfall)}
                    </td>
                    <td className="p-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${REC_STYLE[r.recommendation]}`}
                      >
                        {REC_LABEL[r.recommendation]}
                      </span>
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
                          <span className="text-xs text-emerald-600">✓</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !items.length ? (
              <p className="p-3 text-sm text-slate-500">لا توجد طلبات مطابقة.</p>
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
        <HandCoins className="text-indigo-600" />
      )}
      <div className="mt-3 text-xl font-black">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}
