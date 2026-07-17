"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";

type RiskDecision = "ALLOW" | "REVIEW" | "BLOCK";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
interface RiskEvent { id: string; subjectKind: string; subjectId: string; action: string; score: number; level: RiskLevel; decision: RiskDecision; amount?: number | null; reasons: unknown; createdAt: string; }
const DECISION_STYLE: Record<RiskDecision, string> = { ALLOW: "bg-emerald-100 text-emerald-700", REVIEW: "bg-amber-100 text-amber-700", BLOCK: "bg-red-100 text-red-700" };
const LEVEL_STYLE: Record<RiskLevel, string> = { LOW: "text-emerald-600", MEDIUM: "text-amber-600", HIGH: "text-red-600" };
const AUTO_REFRESH_MS = 30_000;

export default function RiskEventsPage() {
  const [rows, setRows] = useState<RiskEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [subjectKind, setSubjectKind] = useState("");
  const [decision, setDecision] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string; code?: string } | null>(null);

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const res = await api.get("/risk/events", { params: { page, limit: 20, subjectKind: subjectKind || undefined, decision: decision || undefined, subjectId: subjectId.trim() || undefined } });
      setRows(res.data.items ?? []); setTotal(res.data.total ?? 0);
      if (manual) setNotice({ kind: "success", text: "تم التحديث." });
    } catch (e) {
      setNotice({ kind: "error", text: getApiErrorMessage(e, "تعذّر تحميل أحداث المخاطر"), code: getApiErrorCode(e) });
    } finally { setLoading(false); setRefreshing(false); }
  }, [page, subjectKind, decision, subjectId]);

  useEffect(() => { void load(); const t = window.setInterval(() => void load(), AUTO_REFRESH_MS); return () => window.clearInterval(t); }, [load]);

  function formatReasons(r: unknown): string {
    if (!r) return "-";
    if (Array.isArray(r)) return r.map(String).join("، ") || "-";
    if (typeof r === "object") return JSON.stringify(r);
    return String(r);
  }

  return <><Topbar title="سجل أحداث المخاطر — Risk Events" /><main className="space-y-5 p-4 sm:p-6">
    <section className="flex flex-col gap-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-sm font-semibold text-purple-600">Stage 28 · Risk Events</p><h1 className="mt-1 text-2xl font-bold">سجل أحداث المخاطر</h1><p className="mt-1 text-sm text-slate-500">قراءة فقط — كل تقييم مخاطر يُسجَّل هنا. للإجراءات استخدم Risk Reviews أو Holds.</p></div>
      <button onClick={() => void load(true)} disabled={loading || refreshing} className="flex min-h-11 items-center gap-2 self-start rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{refreshing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />} تحديث</button>
    </section>
    {notice ? <div className={`flex gap-2 rounded-xl border p-4 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<div>{notice.text}{notice.code ? <div className="font-mono text-xs">code: {notice.code}</div> : null}</div></div> : null}
    <section className="grid gap-3 rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-4">
      <select value={subjectKind} onChange={(e) => { setPage(1); setSubjectKind(e.target.value); }} className="min-h-11 rounded-xl border px-3 dark:bg-gray-950"><option value="">كل الأنواع</option>{["USER","DRIVER","PAYMENT","WITHDRAWAL","TRIP"].map((k) => <option key={k} value={k}>{k}</option>)}</select>
      <select value={decision} onChange={(e) => { setPage(1); setDecision(e.target.value); }} className="min-h-11 rounded-xl border px-3 dark:bg-gray-950"><option value="">كل القرارات</option><option value="ALLOW">ALLOW</option><option value="REVIEW">REVIEW</option><option value="BLOCK">BLOCK</option></select>
      <input value={subjectId} onChange={(e) => { setPage(1); setSubjectId(e.target.value); }} placeholder="معرّف الكيان" className="min-h-11 rounded-xl border px-3 dark:bg-gray-950" />
      <div className="flex min-h-11 items-center rounded-xl bg-slate-100 px-4 text-sm font-semibold dark:bg-gray-800">{num(total)} حدث</div>
    </section>
    {loading ? <Empty icon={<Loader2 className="animate-spin" />} text="جارٍ التحميل..." /> : rows.length === 0 ? <Empty icon={<Activity />} text="لا توجد أحداث مطابقة." /> : <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((r) => <article key={r.id} className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><span className="font-medium">{r.action}</span><div className="mt-0.5 text-sm text-slate-500">{r.subjectKind} · <span className="font-mono text-xs">{r.subjectId}</span></div></div>
          <div className="flex gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${DECISION_STYLE[r.decision]}`}>{r.decision}</span><span className={`text-sm font-bold ${LEVEL_STYLE[r.level]}`}>{r.level}</span></div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-2 dark:bg-gray-800/70"><div className="text-xs text-slate-400">الدرجة</div><div className="font-bold">{r.score}</div></div>
          <div className="rounded-lg bg-slate-50 p-2 dark:bg-gray-800/70"><div className="text-xs text-slate-400">المبلغ</div><div className="font-bold">{r.amount ?? "-"}</div></div>
          <div className="rounded-lg bg-slate-50 p-2 dark:bg-gray-800/70"><div className="text-xs text-slate-400">التاريخ</div><div className="font-bold text-xs">{dateTime(r.createdAt)}</div></div>
        </div>
        <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500 dark:bg-gray-800/70">الأسباب: {formatReasons(r.reasons)}</div>
      </article>)}
    </div>}
    <div className="flex items-center justify-between text-sm text-slate-500"><span>الصفحة {page}</span><div className="flex gap-2"><button className="min-h-11 rounded-xl border px-4 disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => setPage((v) => v - 1)}>السابق</button><button className="min-h-11 rounded-xl border px-4 disabled:opacity-40" disabled={page * 20 >= total || loading} onClick={() => setPage((v) => v + 1)}>التالي</button></div></div>
  </main></>;
}
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border bg-white text-slate-400 dark:border-gray-800 dark:bg-gray-900">{icon}<p className="text-sm">{text}</p></div>; }
