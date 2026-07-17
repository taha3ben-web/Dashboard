"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, RefreshCw, ShieldCheck, ShieldX } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

type ReviewStatus = "OPEN" | "APPROVED" | "REJECTED";
interface RiskReview {
  id: string;
  riskEventId?: string | null;
  subjectKind: string;
  subjectId: string;
  action: string;
  score: number;
  status: ReviewStatus;
  resolution?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}
interface ResolveDialog {
  open: boolean;
  review: RiskReview | null;
  decision: "APPROVED" | "REJECTED";
  resolution: string;
  loading: boolean;
  error: string;
}
const AUTO_REFRESH_MS = 30_000;

export default function RiskReviewsPage() {
  const { can } = useAuth();
  const canManage = can("risk.review", "risk.manage");
  const [tab, setTab] = useState<ReviewStatus>("OPEN");
  const [rows, setRows] = useState<RiskReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string; code?: string } | null>(null);
  const [dialog, setDialog] = useState<ResolveDialog>({ open: false, review: null, decision: "APPROVED", resolution: "", loading: false, error: "" });

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const res = await api.get("/risk/reviews", { params: { status: tab } });
      setRows(res.data ?? []);
      if (manual) setNotice({ kind: "success", text: "تم التحديث." });
    } catch (e) {
      setNotice({ kind: "error", text: getApiErrorMessage(e, "تعذّر تحميل المراجعات"), code: getApiErrorCode(e) });
    } finally { setLoading(false); setRefreshing(false); }
  }, [tab]);

  useEffect(() => { void load(); const t = window.setInterval(() => void load(), AUTO_REFRESH_MS); return () => window.clearInterval(t); }, [load]);

  async function resolve() {
    if (!dialog.review || !dialog.decision) return;
    if (!dialog.resolution.trim() && dialog.decision === "REJECTED") {
      setDialog((d) => ({ ...d, error: "يُلزم إدخال سبب الرفض." })); return;
    }
    setDialog((d) => ({ ...d, loading: true, error: "" }));
    try {
      await api.post(`/risk/reviews/${dialog.review.id}/resolve`, { decision: dialog.decision, resolution: dialog.resolution.trim() || undefined });
      setDialog({ open: false, review: null, decision: "APPROVED", resolution: "", loading: false, error: "" });
      setNotice({ kind: "success", text: `تم ${dialog.decision === "APPROVED" ? "الموافقة على" : "رفض"} المراجعة.` });
      void load();
    } catch (e) {
      setDialog((d) => ({ ...d, loading: false, error: getApiErrorMessage(e, "تعذّر معالجة المراجعة") }));
    }
  }

  const SCORE_COLOR = (s: number) => s >= 70 ? "text-red-600 bg-red-50" : s >= 40 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50";

  return <><Topbar title="طابور المراجعة — Risk Reviews" /><main className="space-y-5 p-4 sm:p-6">
    <section className="flex flex-col gap-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-sm font-semibold text-amber-600">Stage 28 · Risk Reviews</p><h1 className="mt-1 text-2xl font-bold">مراجعة قرارات المخاطر</h1><p className="mt-1 text-sm text-slate-500">معالجة قرارات REVIEW — الموافقة أو الرفض مع سبب مطلوب عند الرفض.</p></div>
      <button onClick={() => void load(true)} disabled={loading || refreshing} className="flex min-h-11 items-center gap-2 self-start rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{refreshing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />} تحديث</button>
    </section>
    {notice ? <div className={`flex gap-2 rounded-xl border p-4 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<div>{notice.text}{notice.code ? <div className="font-mono text-xs">code: {notice.code}</div> : null}</div></div> : null}
    <div className="flex gap-1 rounded-xl border bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
      {(["OPEN", "APPROVED", "REJECTED"] as ReviewStatus[]).map((s) => <button key={s} onClick={() => setTab(s)} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${tab === s ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800"}`}>{s === "OPEN" ? "مفتوحة" : s === "APPROVED" ? "موافق عليها" : "مرفوضة"}</button>)}
    </div>
    {loading ? <Empty icon={<Loader2 className="animate-spin" />} text="جارٍ التحميل..." /> : rows.length === 0 ? <Empty icon={<ClipboardList />} text="لا توجد مراجعات في هذه الحالة." /> : <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((r) => <article key={r.id} className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap justify-between gap-3">
          <div><div className="break-all font-mono text-sm font-bold text-brand">{r.id}</div><div className="mt-1 text-sm text-slate-500">{r.subjectKind} · {r.subjectId}</div></div>
          <span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${SCORE_COLOR(r.score)}`}>درجة: {r.score}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label="الإجراء" value={r.action} />
          <Info label="الحالة" value={r.status} />
          <Info label="أُنشئت" value={dateTime(r.createdAt)} />
          {r.resolvedAt ? <Info label="تمت المعالجة" value={dateTime(r.resolvedAt)} /> : null}
          {r.resolution ? <Info label="القرار/السبب" value={r.resolution} /> : null}
        </div>
        {canManage && r.status === "OPEN" ? <div className="mt-4 flex gap-2">
          <button onClick={() => setDialog({ open: true, review: r, decision: "APPROVED", resolution: "", loading: false, error: "" })} className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><ShieldCheck size={15} /> موافقة</button>
          <button onClick={() => setDialog({ open: true, review: r, decision: "REJECTED", resolution: "", loading: false, error: "" })} className="flex items-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"><ShieldX size={15} /> رفض</button>
        </div> : null}
      </article>)}
    </div>}
    <div className="text-sm text-slate-500">{num(rows.length)} مراجعة معروضة</div>
  </main>
  {dialog.open && dialog.review ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
      <h2 className="text-lg font-bold">{dialog.decision === "APPROVED" ? "تأكيد الموافقة" : "تأكيد الرفض"}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">المراجعة: <span className="font-mono text-xs">{dialog.review.id}</span> · الإجراء: {dialog.review.action}</p>
      <label className="mt-4 block"><span className="text-sm font-medium">{dialog.decision === "REJECTED" ? "سبب الرفض (مطلوب)" : "ملاحظات (اختياري)"}</span><textarea value={dialog.resolution} onChange={(e) => setDialog((d) => ({ ...d, resolution: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border p-3 text-sm dark:bg-gray-800" placeholder={dialog.decision === "REJECTED" ? "أدخل سبب الرفض..." : "ملاحظات اختيارية..."} /></label>
      {dialog.error ? <p className="mt-2 text-sm text-red-600">{dialog.error}</p> : null}
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={() => setDialog((d) => ({ ...d, open: false }))} disabled={dialog.loading} className="rounded-xl border px-4 py-2 text-sm">إلغاء</button>
        <button onClick={() => void resolve()} disabled={dialog.loading} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${dialog.decision === "APPROVED" ? "bg-emerald-600" : "bg-red-600"}`}>{dialog.loading ? <Loader2 size={15} className="animate-spin" /> : null}{dialog.decision === "APPROVED" ? "تأكيد الموافقة" : "تأكيد الرفض"}</button>
      </div>
    </div>
  </div> : null}
</>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3 dark:bg-gray-800/70"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 break-all text-sm font-semibold">{value}</div></div>; }
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border bg-white text-slate-400 dark:border-gray-800 dark:bg-gray-900">{icon}<p className="text-sm">{text}</p></div>; }
