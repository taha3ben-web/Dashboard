"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import {
  PaymentActionDialog,
  type PaymentActionDraft,
} from "@/components/PaymentActionDialog";
import {
  api,
  getApiErrorCode,
  getApiErrorMessage,
} from "@/lib/api";
import { dateTime, money, num } from "@/lib/format";
import {
  availablePaymentActions,
  PAYMENT_ACTION_LABELS,
  type PaymentAction,
  type PaymentStatus,
} from "@/lib/payment";
import { useAuth } from "@/providers/AuthProvider";

interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  provider: string;
  providerPaymentId?: string | null;
  providerStatus?: string | null;
  status: PaymentStatus;
  statusReason?: string | null;
  reference?: string | null;
  createdAt: string;
  authorizedAt?: string | null;
  capturedAt?: string | null;
  refundedAt?: string | null;
  failedAt?: string | null;
  user: { name: string; phone: string };
  trip: { id: string; fare?: number | null; status: string; currency: string };
}

interface PaymentSummary {
  totalCount: number;
  totalAmount: number;
  capturedAmount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
}

const STATUS_OPTIONS: Array<{ value: "" | PaymentStatus; label: string }> = [
  { value: "", label: "كل الحالات" },
  ...(["PENDING", "AUTHORIZED", "CAPTURED", "PAID", "FAILED", "REFUNDED", "CANCELED"] as PaymentStatus[]).map(
    (value) => ({ value, label: value }),
  ),
];
const METHOD_OPTIONS = ["", "CASH", "CARD", "WALLET"];
const AUTO_REFRESH_MS = 30_000;

function statusClass(status: PaymentStatus): string {
  if (status === "CAPTURED" || status === "PAID") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (status === "AUTHORIZED") return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  if (status === "REFUNDED") return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  if (status === "FAILED" || status === "CANCELED") return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  return "bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300";
}

export default function PaymentsPage() {
  const { can } = useAuth();
  const canManage = can("payments.manage");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | PaymentStatus>("");
  const [method, setMethod] = useState("");
  const [provider, setProvider] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState<PaymentActionDraft | null>(null);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string; code?: string } | null>(null);

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        status: status || undefined,
        method: method || undefined,
        provider: provider.trim() || undefined,
        search: search.trim() || undefined,
      };
      const [listResponse, summaryResponse] = await Promise.all([
        api.get("/payments", { params }),
        api.get("/payments/summary", { params }),
      ]);
      setRows(listResponse.data.items ?? []);
      setTotal(listResponse.data.total ?? 0);
      setSummary(summaryResponse.data ?? null);
      if (manual) setNotice({ kind: "success", text: "تم تحديث بيانات المدفوعات." });
    } catch (error) {
      setNotice({
        kind: "error",
        text: getApiErrorMessage(error, "تعذّر تحميل المدفوعات"),
        code: getApiErrorCode(error),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [method, page, provider, search, status]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  function openAction(row: PaymentRow, action: PaymentAction) {
    if (!canManage || busy) return;
    setReference(row.reference ?? row.providerPaymentId ?? "");
    setReason("");
    setDraft({ action, paymentId: row.id, paymentLabel: row.id.slice(0, 8) });
  }

  async function confirmAction() {
    if (!draft || busy || !canManage) return;
    if ((draft.action === "refund" || draft.action === "cancel") && !reason.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      await api.post(`/payments/${draft.paymentId}/${draft.action}`, {
        reference: reference.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      const label = PAYMENT_ACTION_LABELS[draft.action];
      setDraft(null);
      setNotice({ kind: "success", text: `تم ${label} بنجاح وسُجّل الإجراء في Audit Log.` });
      await load();
    } catch (error) {
      const code = getApiErrorCode(error);
      setNotice({
        kind: "error",
        text: code === "INVALID_PAYMENT_TRANSITION"
          ? "تغيّرت حالة الدفعة ولم يعد هذا الانتقال مسموحًا. تم تحديث القائمة."
          : getApiErrorMessage(error, "تعذّر تنفيذ إجراء الدفع"),
        code,
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const columns = useMemo<Column<PaymentRow>[]>(() => [
    {
      key: "payment",
      header: "الدفعة / الراكب",
      render: (row) => <div className="min-w-48"><Link href={`/payments/${row.id}`} className="font-mono text-xs font-bold text-brand hover:underline">{row.id.slice(0, 12)}</Link><div className="mt-1 font-medium">{row.user.name}</div><div className="text-xs text-slate-500">{row.user.phone}</div></div>,
    },
    {
      key: "trip",
      header: "الرحلة",
      render: (row) => <div><div className="font-mono text-xs">{row.trip.id.slice(0, 12)}</div><div className="text-xs text-slate-500">{row.trip.status}</div></div>,
    },
    {
      key: "amount",
      header: "المبلغ",
      render: (row) => <div className="font-semibold">{money(row.amount, row.trip.currency)}<div className="text-xs font-normal text-slate-500">{row.trip.currency}</div></div>,
    },
    { key: "method", header: "الطريقة" },
    {
      key: "provider",
      header: "المزوّد / المرجع",
      render: (row) => <div className="max-w-52"><div className="font-medium">{row.provider}</div><div className="truncate font-mono text-xs text-slate-500" title={row.providerPaymentId ?? row.reference ?? ""}>{row.providerPaymentId ?? row.reference ?? "-"}</div><div className="text-xs text-slate-500">{row.providerStatus ?? "-"}</div></div>,
    },
    {
      key: "status",
      header: "الحالة",
      render: (row) => <div className="max-w-44"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(row.status)}`}>{row.status}</span>{row.statusReason ? <div className="mt-1 line-clamp-2 text-xs text-red-600 dark:text-red-300" title={row.statusReason}>{row.statusReason}</div> : null}</div>,
    },
    {
      key: "time",
      header: "آخر تحديث مالي",
      render: (row) => dateTime(row.refundedAt ?? row.failedAt ?? row.capturedAt ?? row.authorizedAt ?? row.createdAt),
    },
    {
      key: "actions",
      header: "الإجراءات المسموحة",
      render: (row) => {
        const actions = availablePaymentActions(row.status, row.method);
        return <div className="flex min-w-48 flex-wrap gap-2"><Link href={`/payments/${row.id}`} className="flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold dark:border-gray-700">التفاصيل</Link>{canManage ? actions.map((action) => <button key={action} type="button" onClick={() => openAction(row, action)} disabled={busy} className={`min-h-11 rounded-xl px-3 text-xs font-semibold text-white disabled:opacity-50 ${action === "refund" ? "bg-amber-600" : action === "cancel" ? "bg-red-600" : "bg-brand"}`}>{PAYMENT_ACTION_LABELS[action]}</button>) : null}{canManage && actions.length === 0 ? <span className="self-center text-xs text-slate-500">حالة نهائية</span> : null}</div>;
      },
    },
  ], [busy, canManage]);

  return <>
    <Topbar title="Control Plane المدفوعات" />
    <main className="space-y-5 p-4 sm:p-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-sm font-semibold text-brand">Stage 27 · Payments</p><h1 className="mt-1 text-2xl font-bold">حركة الدفع من المزوّد إلى Ledger</h1><p className="mt-1 text-sm text-slate-500">تحديث تلقائي كل 30 ثانية · الإجراءات تظهر حسب آلة الحالات والصلاحية.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/refunds" className="flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 px-4 text-sm font-semibold text-amber-700 dark:border-amber-800 dark:text-amber-300"><RotateCcw size={17}/> مركز الاستردادات</Link><button type="button" onClick={() => void load(true)} disabled={refreshing || loading} className="flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{refreshing ? <Loader2 size={17} className="animate-spin"/> : <RefreshCw size={17}/>} تحديث الآن</button></div>
      </section>

      {!canManage ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">وضع القراءة فقط: إجراءات الدفع الحساسة تتطلب <code>payments.manage</code>.</div> : null}
      {notice ? <div role="status" className={`flex items-start gap-2 rounded-xl border p-4 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"}`}>{notice.kind === "success" ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}<div>{notice.text}{notice.code ? <div className="mt-1 font-mono text-xs">code: {notice.code}</div> : null}</div></div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"><StatCard label="إجمالي المدفوعات" value={num(summary?.totalCount)} icon={<CreditCard size={18}/>} /><StatCard label="القيمة الكلية" value={money(summary?.totalAmount)} icon={<ShieldCheck size={18}/>} accent="brand"/><StatCard label="القيمة الملتقطة" value={money(summary?.capturedAmount)} icon={<ShieldCheck size={18}/>} accent="green"/><StatCard label="الاستردادات" value={num(summary?.refundedCount)} icon={<RotateCcw size={18}/>} accent="amber"/><StatCard label="المعلّقة" value={num(summary?.pendingCount)} icon={<CreditCard size={18}/>} accent="blue"/><StatCard label="الفاشلة" value={num(summary?.failedCount)} icon={<XCircle size={18}/>} accent="red"/></div>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-2 xl:grid-cols-5">
        <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value as "" | PaymentStatus); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-950">{STATUS_OPTIONS.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}</select>
        <select value={method} onChange={(event) => { setPage(1); setMethod(event.target.value); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-950">{METHOD_OPTIONS.map((value) => <option key={value || "all"} value={value}>{value || "كل الطرق"}</option>)}</select>
        <input value={provider} onChange={(event) => { setPage(1); setProvider(event.target.value); }} placeholder="المزوّد" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-950" />
        <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="مرجع، رحلة، اسم أو هاتف" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-950 xl:col-span-2" />
      </section>

      <DataTable columns={columns} rows={rows} loading={loading} empty="لا توجد مدفوعات مطابقة" />
      <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>الإجمالي {num(total)} · الصفحة {page}</span><div className="flex gap-2"><button className="min-h-11 rounded-xl border px-4 disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>السابق</button><button className="min-h-11 rounded-xl border px-4 disabled:opacity-40" disabled={page * 20 >= total || loading} onClick={() => setPage((value) => value + 1)}>التالي</button></div></div>
    </main>
    <PaymentActionDialog draft={draft} reference={reference} reason={reason} busy={busy} onReferenceChange={setReference} onReasonChange={setReason} onCancel={() => { if (!busy) setDraft(null); }} onConfirm={() => void confirmAction()} />
  </>;
}
