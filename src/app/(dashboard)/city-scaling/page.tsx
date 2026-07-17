"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Gauge, Loader2, MapPin, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

type LaunchStatus = "PLANNED" | "PILOT" | "LIVE" | "PAUSED";
const STATUSES: LaunchStatus[] = ["PLANNED", "PILOT", "LIVE", "PAUSED"];
const RIDE_CLASSES = ["ECONOMY", "COMFORT", "PREMIUM", "VAN"];
interface City { id: string; name: string; country?: string | null; isActive: boolean; _count?: { drivers: number; trips: number }; }
interface Control { id: string; cityId: string; launchStatus: LaunchStatus; maxActiveDrivers?: number | null; maxDailyTrips?: number | null; enabledRideClasses: string[]; surgeCap?: number | null; notes?: string | null; updatedAt: string; }
interface Acceptance { accept: boolean; reason?: string; utilization?: number; activeDrivers?: number; dailyTrips?: number; }
interface Form { cityId: string; maxActiveDrivers: string; maxDailyTrips: string; enabledRideClasses: string[]; surgeCap: string; notes: string; loading: boolean; error: string; }
const AUTO_REFRESH_MS = 30_000;

const emptyForm = (cityId = ""): Form => ({ cityId, maxActiveDrivers: "", maxDailyTrips: "", enabledRideClasses: [], surgeCap: "", notes: "", loading: false, error: "" });

export default function CityScalingPage() {
  const { can } = useAuth();
  const canManage = can("settings.manage");
  const [cities, setCities] = useState<City[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [rideClass, setRideClass] = useState("ECONOMY");
  const [acceptance, setAcceptance] = useState<Acceptance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string; code?: string } | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; control: Control | null; to: LaunchStatus | null; loading: boolean; error: string }>({ open: false, control: null, to: null, loading: false, error: "" });

  const controlsByCity = useMemo(() => new Map(controls.map((control) => [control.cityId, control])), [controls]);
  const selectedControl = selectedCityId ? controlsByCity.get(selectedCityId) : undefined;
  const selectedCity = cities.find((city) => city.id === selectedCityId);

  const hydrateForm = useCallback((cityId: string, control?: Control) => {
    setForm({ cityId, maxActiveDrivers: control?.maxActiveDrivers?.toString() ?? "", maxDailyTrips: control?.maxDailyTrips?.toString() ?? "", enabledRideClasses: control?.enabledRideClasses ?? [], surgeCap: control?.surgeCap?.toString() ?? "", notes: control?.notes ?? "", loading: false, error: "" });
  }, []);

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const [citiesResponse, controlsResponse] = await Promise.all([api.get("/cities"), api.get("/cities/scaling")]);
      const cityRows = citiesResponse.data ?? [];
      const controlRows = controlsResponse.data ?? [];
      setCities(cityRows); setControls(controlRows);
      const cityId = selectedCityId || cityRows[0]?.id || "";
      if (cityId) { setSelectedCityId(cityId); hydrateForm(cityId, controlRows.find((row: Control) => row.cityId === cityId)); }
      if (manual) setNotice({ kind: "success", text: "تم تحديث ضوابط المدن." });
    } catch (error) {
      setNotice({ kind: "error", text: getApiErrorMessage(error, "تعذّر تحميل ضوابط المدن"), code: getApiErrorCode(error) });
    } finally { setLoading(false); setRefreshing(false); }
  }, [hydrateForm, selectedCityId]);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), AUTO_REFRESH_MS); return () => window.clearInterval(timer); }, [load]);

  useEffect(() => { if (selectedCityId) hydrateForm(selectedCityId, selectedControl); }, [selectedCityId, selectedControl, hydrateForm]);

  async function checkAcceptance() {
    if (!selectedCityId) return;
    try { const res = await api.get(`/cities/scaling/${selectedCityId}/acceptance`, { params: { rideClass } }); setAcceptance(res.data ?? null); }
    catch (error) { setNotice({ kind: "error", text: getApiErrorMessage(error, "تعذّر فحص قبول الرحلة"), code: getApiErrorCode(error) }); }
  }

  async function saveControl() {
    if (!form.cityId) return;
    setForm((value) => ({ ...value, loading: true, error: "" }));
    try {
      await api.post("/cities/scaling", { cityId: form.cityId, maxActiveDrivers: form.maxActiveDrivers ? Number(form.maxActiveDrivers) : null, maxDailyTrips: form.maxDailyTrips ? Number(form.maxDailyTrips) : null, enabledRideClasses: form.enabledRideClasses, surgeCap: form.surgeCap ? Number(form.surgeCap) : null, notes: form.notes.trim() || undefined });
      setNotice({ kind: "success", text: "تم حفظ ضوابط السعة وRide Classes وSurge. سُجل التغيير في AuditLog." });
      await load(true);
    } catch (error) { setForm((value) => ({ ...value, loading: false, error: getApiErrorMessage(error, "تعذّر حفظ الضوابط") })); }
  }

  async function changeStatus() {
    if (!statusDialog.control || !statusDialog.to) return;
    setStatusDialog((value) => ({ ...value, loading: true, error: "" }));
    try {
      await api.patch(`/cities/scaling/${statusDialog.control.cityId}/launch-status`, { status: statusDialog.to });
      setStatusDialog({ open: false, control: null, to: null, loading: false, error: "" });
      setNotice({ kind: "success", text: `تم تغيير حالة الإطلاق إلى ${statusDialog.to}. سُجل التغيير في AuditLog.` });
      await load(true);
    } catch (error) { setStatusDialog((value) => ({ ...value, loading: false, error: getApiErrorMessage(error, "تعذّر تغيير حالة الإطلاق") })); }
  }

  const statusStyle: Record<LaunchStatus, string> = { PLANNED: "bg-slate-100 text-slate-700", PILOT: "bg-amber-100 text-amber-700", LIVE: "bg-emerald-100 text-emerald-700", PAUSED: "bg-red-100 text-red-700" };

  return <><Topbar title="City Scaling & Launch Control" /><main className="space-y-5 p-4 sm:p-6">
    <section className="flex flex-col gap-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-sm font-semibold text-indigo-600">Stage 31 · City Scaling</p><h1 className="mt-1 text-2xl font-bold">ضوابط إطلاق وتوسّع المدن</h1><p className="mt-1 text-sm text-slate-500">السعة، Ride Classes، سقف Surge، وفحص قبول رحلة لكل مدينة.</p></div>
      <button onClick={() => void load(true)} disabled={loading || refreshing} className="flex min-h-11 items-center gap-2 self-start rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{refreshing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />} تحديث</button>
    </section>
    {notice ? <div className={`flex gap-2 rounded-xl border p-4 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<div>{notice.text}{notice.code ? <div className="font-mono text-xs">code: {notice.code}</div> : null}</div></div> : null}
    {loading ? <Empty text="جارٍ تحميل المدن والضوابط..." /> : <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border bg-white p-3 dark:border-gray-800 dark:bg-gray-900"><div className="mb-2 px-2 text-sm font-bold">المدن</div>{cities.length === 0 ? <p className="p-2 text-sm text-slate-500">لا توجد مدن مهيأة.</p> : cities.map((city) => { const control = controlsByCity.get(city.id); return <button key={city.id} onClick={() => { setSelectedCityId(city.id); setAcceptance(null); }} className={`mb-1 w-full rounded-xl p-3 text-right ${selectedCityId === city.id ? "bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-950/30" : "hover:bg-slate-50 dark:hover:bg-gray-800"}`}><div className="flex items-center justify-between gap-2"><span className="font-semibold">{city.name}</span>{control ? <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusStyle[control.launchStatus]}`}>{control.launchStatus}</span> : <span className="text-xs text-slate-400">بلا ضبط</span>}</div><div className="mt-1 text-xs text-slate-500">{city.country ?? "-"} · {num(city._count?.drivers)} سائق</div></button>; })}</aside>
      <section className="space-y-5">
        <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold"><MapPin size={18} />{selectedCity?.name ?? "اختر مدينة"}</h2><p className="mt-1 text-sm text-slate-500">{selectedCity?.country ?? ""} · {num(selectedCity?._count?.trips)} رحلة مرتبطة</p></div>{selectedControl ? <span className={`rounded-full px-3 py-1 text-sm font-bold ${statusStyle[selectedControl.launchStatus]}`}>{selectedControl.launchStatus}</span> : null}</div>
          {selectedControl && canManage ? <div className="mt-4 flex flex-wrap gap-2">{STATUSES.filter((status) => status !== selectedControl.launchStatus).map((status) => <button key={status} onClick={() => setStatusDialog({ open: true, control: selectedControl, to: status, loading: false, error: "" })} className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800">تغيير إلى {status}</button>)}</div> : null}
        </div>
        <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><div className="mb-4 flex items-center gap-2"><Gauge size={18} /><h2 className="font-bold">ضوابط السعة والتشغيل</h2></div><div className="grid gap-3 sm:grid-cols-2"><Field label="حد السائقين النشطين"><input type="number" min="0" value={form.maxActiveDrivers} onChange={(e) => setForm((v) => ({ ...v, maxActiveDrivers: e.target.value }))} disabled={!canManage} className="input" placeholder="بلا حد" /></Field><Field label="حد الرحلات اليومي"><input type="number" min="0" value={form.maxDailyTrips} onChange={(e) => setForm((v) => ({ ...v, maxDailyTrips: e.target.value }))} disabled={!canManage} className="input" placeholder="بلا حد" /></Field><Field label="Surge cap"><input type="number" min="1" step="0.1" value={form.surgeCap} onChange={(e) => setForm((v) => ({ ...v, surgeCap: e.target.value }))} disabled={!canManage} className="input" placeholder="بلا سقف" /></Field><Field label="ملاحظات"><input value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} disabled={!canManage} className="input" placeholder="ملاحظات تشغيلية" /></Field></div><div className="mt-4"><div className="mb-2 text-sm font-medium">Ride Classes المفعّلة <span className="text-xs text-slate-500">(فارغة = الكل)</span></div><div className="flex flex-wrap gap-2">{RIDE_CLASSES.map((ride) => <label key={ride} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-700"><input type="checkbox" checked={form.enabledRideClasses.includes(ride)} disabled={!canManage} onChange={() => setForm((v) => ({ ...v, enabledRideClasses: v.enabledRideClasses.includes(ride) ? v.enabledRideClasses.filter((item) => item !== ride) : [...v.enabledRideClasses, ride] }))} />{ride}</label>)}</div></div>{form.error ? <p className="mt-3 text-sm text-red-600">{form.error}</p> : null}{canManage ? <button onClick={() => void saveControl()} disabled={form.loading || !form.cityId} className="mt-5 flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{form.loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ الضوابط</button> : <p className="mt-4 text-sm text-slate-500">وضع القراءة فقط — تتطلب التعديلات settings.manage.</p>}</section>
          <section className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><div className="mb-4 flex items-center gap-2"><ShieldCheck size={18} /><h2 className="font-bold">فحص قبول رحلة</h2></div><label className="text-sm font-medium">Ride Class<select value={rideClass} onChange={(e) => setRideClass(e.target.value)} className="input mt-1">{RIDE_CLASSES.map((ride) => <option key={ride}>{ride}</option>)}</select></label><button onClick={() => void checkAcceptance()} disabled={!selectedCityId} className="mt-4 min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50">فحص القبول</button>{acceptance ? <div className={`mt-4 rounded-xl border p-4 ${acceptance.accept ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}><div className="font-bold">{acceptance.accept ? "يمكن قبول الطلب" : "يُحجب الطلب"}</div><div className="mt-2 text-sm">السبب: {acceptance.reason ?? "ضمن الضوابط"}</div><div className="mt-2 grid grid-cols-3 gap-2 text-xs"><Metric label="الاستغلال" value={`${Math.round((acceptance.utilization ?? 0) * 100)}%`} /><Metric label="السائقون" value={num(acceptance.activeDrivers)} /><Metric label="رحلات اليوم" value={num(acceptance.dailyTrips)} /></div></div> : <p className="mt-4 text-sm text-slate-500">يفحص الحالة والسعة وRide Class دون إنشاء رحلة.</p>}</section></div>
      </section>
    </div>}
  </main>
  {statusDialog.open && statusDialog.control && statusDialog.to ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900"><h2 className="text-lg font-bold">تأكيد تغيير حالة الإطلاق</h2><p className="mt-2 text-sm">سيتم تغيير المدينة من <b>{statusDialog.control.launchStatus}</b> إلى <b>{statusDialog.to}</b>. قد يؤثر ذلك على قبول الرحلات فوراً.</p>{statusDialog.error ? <p className="mt-2 text-sm text-red-600">{statusDialog.error}</p> : null}<div className="mt-5 flex justify-end gap-3"><button onClick={() => setStatusDialog((v) => ({ ...v, open: false }))} disabled={statusDialog.loading} className="rounded-xl border px-4 py-2 text-sm">إلغاء</button><button onClick={() => void changeStatus()} disabled={statusDialog.loading} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{statusDialog.loading ? <Loader2 size={15} className="animate-spin" /> : null}تأكيد التغيير</button></div></div></div> : null}
</>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium"><span>{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-white/70 p-2"><div className="text-slate-500">{label}</div><div className="mt-1 font-bold">{value}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="flex min-h-64 items-center justify-center rounded-2xl border bg-white text-sm text-slate-500 dark:border-gray-800 dark:bg-gray-900">{text}</div>; }
