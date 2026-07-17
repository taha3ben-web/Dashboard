"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

type BlacklistKind = "USER" | "DEVICE" | "IP" | "PHONE" | "CARD";
const KINDS: BlacklistKind[] = ["USER", "DEVICE", "IP", "PHONE", "CARD"];
interface BlacklistEntry { id: string; kind: BlacklistKind; value: string; reason?: string | null; active: boolean; createdBy?: string | null; createdAt: string; }
interface AddForm { kind: BlacklistKind; value: string; reason: string; loading: boolean; error: string; }
interface RemoveDialog { open: boolean; entry: BlacklistEntry | null; loading: boolean; error: string; }
const AUTO_REFRESH_MS = 30_000;

export default function BlacklistPage() {
  const { can } = useAuth();
  const canManage = can("risk.manage");
  const [filter, setFilter] = useState<BlacklistKind | "">("");
  const [rows, setRows] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string; code?: string } | null>(null);
  const [form, setForm] = useState<AddForm>({ kind: "IP", value: "", reason: "", loading: false, error: "" });
  const [removeDialog, setRemoveDialog] = useState<RemoveDialog>({ open: false, entry: null, loading: false, error: "" });

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const res = await api.get("/risk/blacklist", { params: filter ? { kind: filter } : {} });
      setRows(res.data ?? []);
      if (manual) setNotice({ kind: "success", text: "تم التحديث." });
    } catch (e) {
      setNotice({ kind: "error", text: getApiErrorMessage(e, "تعذّر تحميل قائمة الحظر"), code: getApiErrorCode(e) });
    } finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { void load(); const t = window.setInterval(() => void load(), AUTO_REFRESH_MS); return () => window.clearInterval(t); }, [load]);

  async function addEntry() {
    if (!form.value.trim()) { setForm((f) => ({ ...f, error: "القيمة مطلوبة." })); return; }
    setForm((f) => ({ ...f, loading: true, error: "" }));
    try {
      await api.post("/risk/blacklist", { kind: form.kind, value: form.value.trim(), reason: form.reason.trim() || undefined });
      setForm((f) => ({ ...f, value: "", reason: "", loading: false }));
      setNotice({ kind: "success", text: `تم إضافة ${form.kind}:${form.value.trim()} إلى قائمة الحظر.` });
      void load();
    } catch (e) {
      setForm((f) => ({ ...f, loading: false, error: getApiErrorMessage(e, "تعذّر الإضافة") }));
    }
  }

  async function removeEntry() {
    if (!removeDialog.entry) return;
    setRemoveDialog((d) => ({ ...d, loading: true, error: "" }));
    try {
      await api.delete("/risk/blacklist", { data: { kind: removeDialog.entry.kind, value: removeDialog.entry.value } });
      setNotice({ kind: "success", text: `تم إزالة ${removeDialog.entry.kind}:${removeDialog.entry.value} من قائمة الحظر.` });
      setRemoveDialog({ open: false, entry: null, loading: false, error: "" });
      void load();
    } catch (e) {
      setRemoveDialog((d) => ({ ...d, loading: false, error: getApiErrorMessage(e, "تعذّر الإزالة") }));
    }
  }

  const KIND_COLORS: Record<BlacklistKind, string> = { USER: "bg-red-100 text-red-700", DEVICE: "bg-orange-100 text-orange-700", IP: "bg-purple-100 text-purple-700", PHONE: "bg-blue-100 text-blue-700", CARD: "bg-pink-100 text-pink-700" };

  return <><Topbar title="قائمة الحظر — Blacklist" /><main className="space-y-5 p-4 sm:p-6">
    <section className="flex flex-col gap-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-sm font-semibold text-red-600">Stage 28 · Blacklist</p><h1 className="mt-1 text-2xl font-bold">إدارة قائمة الحظر</h1><p className="mt-1 text-sm text-slate-500">حظر مستخدم/جهاز/IP/هاتف/بطاقة. الحظر يدوي — لا يؤثر على الأرصدة مباشرة.</p></div>
      <button onClick={() => void load(true)} disabled={loading || refreshing} className="flex min-h-11 items-center gap-2 self-start rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{refreshing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />} تحديث</button>
    </section>
    {notice ? <div className={`flex gap-2 rounded-xl border p-4 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<div>{notice.text}{notice.code ? <div className="font-mono text-xs">code: {notice.code}</div> : null}</div></div> : null}
    {canManage ? <section className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 font-bold">إضافة مدخل جديد</h2>
      <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto]"><select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as BlacklistKind }))} className="min-h-11 rounded-xl border px-3 dark:bg-gray-950">{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select><input value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="القيمة (IP أو ID أو رقم...)" className="min-h-11 rounded-xl border px-3 dark:bg-gray-950" /><input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="السبب (اختياري)" className="min-h-11 rounded-xl border px-3 dark:bg-gray-950" /><button onClick={() => void addEntry()} disabled={form.loading} className="flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{form.loading ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />} حظر</button></div>
      {form.error ? <p className="mt-2 text-sm text-red-600">{form.error}</p> : null}
    </section> : null}
    <div className="flex flex-wrap gap-2">{([["", "الكل"], ...KINDS.map((k) => [k, k])] as [string, string][]).map(([v, l]) => <button key={v} onClick={() => setFilter(v as BlacklistKind | "")} className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${filter === v ? "bg-brand text-white" : "dark:border-gray-700 dark:text-slate-300"}`}>{l}</button>)}</div>
    {loading ? <Empty icon={<Loader2 className="animate-spin" />} text="جارٍ التحميل..." /> : rows.length === 0 ? <Empty icon={<Ban />} text="لا توجد مدخلات نشطة." /> : <div className="grid gap-3 xl:grid-cols-2">
      {rows.map((r) => <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${KIND_COLORS[r.kind]}`}>{r.kind}</span><span className="break-all font-mono text-sm font-semibold">{r.value}</span></div>
          <div className="mt-1 text-sm text-slate-500">{r.reason ?? "بلا سبب مسجّل"} · {dateTime(r.createdAt)}</div>
        </div>
        {canManage ? <button onClick={() => setRemoveDialog({ open: true, entry: r, loading: false, error: "" })} className="flex shrink-0 items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /> رفع</button> : null}
      </div>)}
    </div>}
  </main>
  {removeDialog.open && removeDialog.entry ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
      <h2 className="text-lg font-bold">رفع الحظر</h2>
      <p className="mt-2 text-sm">هل تريد إزالة الحظر عن <span className="font-mono font-bold">{removeDialog.entry.kind}:{removeDialog.entry.value}</span>؟ هذا الإجراء يُوقف الحظر ويُسجَّل في AuditLog.</p>
      {removeDialog.error ? <p className="mt-2 text-sm text-red-600">{removeDialog.error}</p> : null}
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={() => setRemoveDialog((d) => ({ ...d, open: false }))} disabled={removeDialog.loading} className="rounded-xl border px-4 py-2 text-sm">إلغاء</button>
        <button onClick={() => void removeEntry()} disabled={removeDialog.loading} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{removeDialog.loading ? <Loader2 size={15} className="animate-spin" /> : null}تأكيد رفع الحظر</button>
      </div>
    </div>
  </div> : null}
</>;
}
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border bg-white text-slate-400 dark:border-gray-800 dark:bg-gray-900">{icon}<p className="text-sm">{text}</p></div>; }
