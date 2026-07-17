"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { dateTime, money, num } from "@/lib/format";

interface RefundEvent { id: string; type: string; reference?: string | null; createdAt: string }
interface RefundRow {
  id: string; amount: number; provider: string; providerPaymentId?: string | null;
  reference?: string | null; statusReason?: string | null; refundedAt?: string | null;
  user: { name: string; phone: string };
  trip: { id: string; status: string; currency: string };
  events: RefundEvent[];
  ledgerReversal?: { id: string; status: string; currency: string; createdAt: string; reversalOf?: { id: string } | null } | null;
}
const AUTO_REFRESH_MS = 30_000;

export default function RefundsPage() {
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [provider, setProvider] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string; code?: string } | null>(null);

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const response = await api.get("/payments/refunds", { params: { page, limit: 20, provider: provider.trim() || undefined, search: search.trim() || undefined } });
      setRows(response.data.items ?? []); setTotal(response.data.total ?? 0);
      if (manual) setNotice({ kind: "success", text: "تم تحديث سجل الاستردادات." });
    } catch (error) {
      setNotice({ kind: "error", text: getApiErrorMessage(error, "تعذّر تحميل الاستردادات"), code: getApiErrorCode(error) });
    } finally { setLoading(false); setRefreshing(false); }
  }, [page, provider, search]);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), AUTO_REFRESH_MS); return () => window.clearInterval(timer); }, [load]);

  return <><Topbar title="Control Plane الاستردادات"/><main className="space-y-5 p-4 sm:p-6">
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-sm font-semibold text-amber-600">Stage 27 · Refunds</p><h1 className="mt-1 text-2xl font-bold">سجل الاسترداد وLedger Reversal</h1><p className="mt-1 text-sm text-slate-500">قراءة من Payment وPaymentEvent والقيد العكسي؛ لا تعديل مباشر للرصيد.</p></div>
      <div className="flex gap-2"><Link href="/payments" className="flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold">المدفوعات</Link><button onClick={() => void load(true)} disabled={loading || refreshing} className="flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{refreshing ? <Loader2 size={17} className="animate-spin"/> : <RefreshCw size={17}/>} تحديث</button></div>
    </section>
    {notice ? <div role="status" className={`flex gap-2 rounded-xl border p-4 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20" : "border-red-200 bg-red-50 text-red-800 dark:bg-red-950/20"}`}>{notice.kind === "success" ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}<div>{notice.text}{notice.code ? <div className="font-mono text-xs">code: {notice.code}</div> : null}</div></div> : null}
    <section className="grid gap-3 rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-[1fr_2fr_auto]"><input value={provider} onChange={(event) => { setPage(1); setProvider(event.target.value); }} placeholder="المزوّد" className="min-h-11 rounded-xl border px-3 dark:bg-gray-950"/><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="مرجع، دفعة، رحلة، اسم أو هاتف" className="min-h-11 rounded-xl border px-3 dark:bg-gray-950"/><div className="flex min-h-11 items-center rounded-xl bg-slate-100 px-4 text-sm font-semibold dark:bg-gray-800">{num(total)} استرداد</div></section>
    {loading ? <Empty icon={<Loader2 className="animate-spin"/>} text="جارٍ التحميل..."/> : rows.length === 0 ? <Empty icon={<RotateCcw/>} text="لا توجد استردادات مطابقة."/> : <div className="grid gap-4 xl:grid-cols-2">{rows.map((row) => { const event = row.events[0]; return <article key={row.id} className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap justify-between gap-3"><div><Link href={`/payments/${row.id}`} className="break-all font-mono text-sm font-bold text-brand">{row.id}</Link><div className="mt-1 text-sm text-slate-500">{row.user.name} · {row.user.phone}</div></div><span className="h-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40">REFUNDED</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><Info label="المبلغ" value={money(row.amount, row.trip.currency)}/><Info label="المزوّد" value={row.provider}/><Info label="مرجع المزوّد" value={row.providerPaymentId ?? row.reference ?? "-"} mono/><Info label="الرحلة" value={row.trip.id} mono/><Info label="التاريخ" value={dateTime(row.refundedAt)}/><Info label="السبب" value={row.statusReason ?? "غير مسجل"}/></div>
      <div className="mt-4 rounded-xl border p-4"><div className="text-xs font-bold text-slate-500">PAYMENT EVENT</div><div className="mt-2 text-sm font-semibold">{event?.type ?? "غير موجود"}</div><div className="mt-1 font-mono text-xs text-slate-500">{event?.reference ?? "-"} · {dateTime(event?.createdAt)}</div></div>
      <div className={`mt-3 rounded-xl border p-4 ${row.ledgerReversal ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-red-200 bg-red-50/60 dark:bg-red-950/20"}`}><div className="flex justify-between text-xs font-bold"><span>LEDGER REVERSAL</span><span>{row.ledgerReversal?.status ?? "MISSING"}</span></div>{row.ledgerReversal ? <><div className="mt-2 break-all font-mono text-xs">{row.ledgerReversal.id}</div><div className="mt-1 text-xs text-slate-500">يعكس: {row.ledgerReversal.reversalOf?.id ?? "-"}</div></> : <p className="mt-2 text-sm">فجوة: لا يظهر قيد عكسي مرتبط. راجع المطابقة.</p>}</div>
    </article>; })}</div>}
    <div className="flex items-center justify-between text-sm text-slate-500"><span>الصفحة {page}</span><div className="flex gap-2"><button className="min-h-11 rounded-xl border px-4 disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>السابق</button><button className="min-h-11 rounded-xl border px-4 disabled:opacity-40" disabled={page * 20 >= total || loading} onClick={() => setPage((value) => value + 1)}>التالي</button></div></div>
  </main></>;
}
function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="rounded-xl bg-slate-50 p-3 dark:bg-gray-800/70"><div className="text-xs text-slate-500">{label}</div><div className={`mt-1 break-all text-sm font-semibold ${mono ? "font-mono text-xs" : ""}`}>{value}</div></div>; }
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border bg-white text-slate-500 dark:border-gray-800 dark:bg-gray-900">{icon}<p>{text}</p></div>; }
