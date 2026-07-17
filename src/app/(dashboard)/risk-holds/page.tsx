"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, LockOpen, Loader2, RefreshCw } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

type RiskSubjectKind = "USER" | "DRIVER" | "PAYMENT" | "WITHDRAWAL" | "TRIP";
const SUBJECT_KINDS: RiskSubjectKind[] = ["USER", "DRIVER", "PAYMENT", "WITHDRAWAL", "TRIP"];
interface RiskHold { id: string; subjectKind: string; subjectId: string; reason?: string | null; active: boolean; createdBy?: string | null; releasedBy?: string | null; releasedAt?: string | null; createdAt: string; }
interface PlaceForm { subjectKind: RiskSubjectKind; subjectId: string; reason: string; loading: boolean; error: string; }
interface ReleaseDialog { open: boolean; hold: RiskHold | null; loading: boolean; error: string; }
const AUTO_REFRESH_MS = 30_000;

export default function RiskHoldsPage() {
  const { can } = useAuth();
  const canManage = can("risk.manage");
  const [showActive, setShowActive] = useState(true);
  const [rows, setRows] = useState<RiskHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string; code?: string } | null>(null);
  const [form, setForm] = useState<PlaceForm>({ subjectKind: "USER", subjectId: "", reason: "", loading: false, error: "" });
  const [releaseDialog, setReleaseDialog] = useState<ReleaseDialog>({ open: false, hold: null, loading: false, error: "" });

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const res = await api.get("/risk/holds", { params: { active: showActive } });
      setRows(res.data ?? []);
      if (manual) setNotice({ kind: "success", text: "تم التحديث." });
    } catch (e) {
      setNotice({ kind: "error", text: getApiErrorMessage(e, "تعذّر تحميل الحجوز"), code: getApiErrorCode(e) });
    } finally { setLoading(false); setRefreshing(false); }
  }, [showActive]);

  useEffect(() => { void load(); const t = window.setInterval(() => void load(), AUTO_REFRESH_MS); return () => window.clearInterval(t); }, [load]);

  async function placeHold() {
    if (!form.subjectId.trim()) { setForm((f) => ({ ...f, error: "معرّف الكيان مطلوب." })); return; }
    if (!form.reason.trim()) { setForm((f) => ({ ...f, error: "السبب مطلوب لتوثيق الحجز." })); return; }
    setForm((f) => ({ ...f, loading: true, error: "" }));
    try {
      await api.post("/risk/holds", { subjectKind: form.subjectKind, subjectId: form.subjectId.trim(), reason: form.reason.trim() });
      setForm((f) => ({ ...f, subjectId: "", reason: "", loading: false }));
      setNotice({ kind: "success", text: `تم وضع حجز على ${form.subjectKind}:${form.subjectId}.` });
      void load();
    } catch (e) {
      setForm((f) => ({ ...f, loading: false, error: getApiErrorMessage(e, "تعذّر وضع الحجز") }));
    }
  }

  async function releaseHold() {
    if (!releaseDialog.hold) return;
    setReleaseDialog((d) => ({ ...d, loading: true, error: "" }));
    try {
      await api.post(`/risk/holds/${releaseDialog.hold.id}/release`);
      setNotice({ kind: "success", text: `تم رفع الحجز عن ${releaseDialog.hold.subjectKind}:${releaseDialog.hold.subjectId}.` });
      setReleaseDialog({ open: false, hold: null, loading: false, error: "" });
      void load();
    } catch (e) {
      setReleaseDialog((d) => ({ ...d, loading: false, error: getApiErrorMessage(e, "تعذّر رفع الحجز") }));
    }
  }

  return <><Topbar title="حجوز المخاطر — Risk Holds" /><main className="space-y-5 p-4 sm:p-6">
    <section className="flex flex-col gap-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-sm font-semibold text-orange-600">Stage 28 · Risk Holds</p><h1 className="mt-1 text-2xl font-bold">الحجوز اليدوية</h1><p className="mt-1 text-sm text-slate-500">تجميد كيان (مستخدم/سائق/رحلة/...) ريثما تُحسم مشكلة. لا يؤثر مباشرة على الرصيد.</p></div>
      <button onClick={() => void load(true)} disabled={loading || refreshing} className="flex min-h-11 items-center gap-2 self-start rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{refreshing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />} تحديث</button>
    </section>
    {notice ? <div className={`flex gap-2 rounded-xl border p-4 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<div>{notice.text}{notice.code ? <div className="font-mono text-xs">code: {notice.code}</div> : null}</div></div> : null}
    {canManage ? <section className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 font-bold">وضع حجز جديد</h2>
      <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto]"><select value={form.subjectKind} onChange={(e) => setForm((f) => ({ ...f, subjectKind: e.target.value as RiskSubjectKind }))} className="min-h-11 rounded-xl border px-3 dark:bg-gray-950">{SUBJECT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select><input value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))} placeholder="معرّف الكيان (ID)" className="min-h-11 rounded-xl border px-3 dark:bg-gray-950" /><input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="السبب (مطلوب)" className="min-h-11 rounded-xl border px-3 dark:bg-gray-950" /><button onClick={() => void placeHold()} disabled={form.loading} className="flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{form.loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />} حجز</button></div>
      {form.error ? <p className="mt-2 text-sm text-red-600">{form.error}</p> : null}
    </section> : null}
    <div className="flex gap-1 rounded-xl border bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
      <button onClick={() => setShowActive(true)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${showActive ? "bg-brand text-white" : "text-slate-500"}`}>نشطة</button>
      <button onClick={() => setShowActive(false)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${!showActive ? "bg-brand text-white" : "text-slate-500"}`}>مُفرَجة</button>
    </div>
    {loading ? <Empty icon={<Loader2 className="animate-spin" />} text="جارٍ التحميل..." /> : rows.length === 0 ? <Empty icon={<LockOpen />} text="لا توجد حجوز." /> : <div className="grid gap-3 xl:grid-cols-2">
      {rows.map((r) => <div key={r.id} className={`rounded-2xl border p-4 dark:bg-gray-900 ${r.active ? "border-orange-200 bg-orange-50/50 dark:border-orange-900/40" : "border-gray-200 bg-white dark:border-gray-800"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-2"><span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">{r.subjectKind}</span><span className="break-all font-mono text-sm font-bold">{r.subjectId}</span></div><div className="mt-1 text-sm text-slate-500">{r.reason ?? "بلا سبب"} · {dateTime(r.createdAt)}</div>{r.releasedAt ? <div className="mt-1 text-xs text-slate-400">أُفرج: {dateTime(r.releasedAt)} {r.releasedBy ? `· بواسطة ${r.releasedBy}` : ""}</div> : null}</div>
          {canManage && r.active ? <button onClick={() => setReleaseDialog({ open: true, hold: r, loading: false, error: "" })} className="flex items-center gap-1 rounded-xl border border-orange-300 px-3 py-2 text-sm text-orange-700 hover:bg-orange-100"><LockOpen size={14} /> رفع الحجز</button> : null}
        </div>
      </div>)}
    </div>}
  </main>
  {releaseDialog.open && releaseDialog.hold ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
      <h2 className="text-lg font-bold">رفع الحجز</h2>
      <p className="mt-2 text-sm">هل تريد رفع الحجز عن <span className="font-bold">{releaseDialog.hold.subjectKind}:{releaseDialog.hold.subjectId}</span>؟ يُسجَّل هذا في AuditLog.</p>
      {releaseDialog.error ? <p className="mt-2 text-sm text-red-600">{releaseDialog.error}</p> : null}
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={() => setReleaseDialog((d) => ({ ...d, open: false }))} disabled={releaseDialog.loading} className="rounded-xl border px-4 py-2 text-sm">إلغاء</button>
        <button onClick={() => void releaseHold()} disabled={releaseDialog.loading} className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{releaseDialog.loading ? <Loader2 size={15} className="animate-spin" /> : null}تأكيد رفع الحجز</button>
      </div>
    </div>
  </div> : null}
</>;
}
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border bg-white text-slate-400 dark:border-gray-800 dark:bg-gray-900">{icon}<p className="text-sm">{text}</p></div>; }
