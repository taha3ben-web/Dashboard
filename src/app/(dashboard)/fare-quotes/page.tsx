"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw, Scale } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

interface SimForm {
  rideClass: string;
  vehicleTypeId: string;
  cityId: string;
  pickupLat: string;
  pickupLng: string;
  destLat: string;
  destLng: string;
  distanceKm: string;
  durationSec: string;
}

const EMPTY: SimForm = {
  rideClass: "ECONOMY",
  vehicleTypeId: "",
  cityId: "",
  pickupLat: "36.7538",
  pickupLng: "3.0588",
  destLat: "36.7000",
  destLng: "3.2000",
  distanceKm: "",
  durationSec: "",
};

const RIDE_CLASSES = ["ECONOMY", "COMFORT", "VAN", "XL", "CAR", "BIKE"];

interface SimResult {
  currency: string;
  distanceKm: number;
  durationSec: number;
  suggestedFare: number;
  minFare: number;
  maxFare: number;
  commissionPct: number;
  pricingSource: string;
  pricingRuleId: string | null;
  breakdown: Record<string, unknown>;
}

interface FareQuoteRow {
  id: string;
  passengerId: string;
  rideClass: string;
  cityId: string | null;
  currency: string;
  suggestedFare: number;
  minFare: number;
  maxFare: number;
  proposedFare: number | null;
  status: string;
  tripId: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  QUOTED: "bg-blue-100 text-blue-700",
  PROPOSED: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-green-100 text-green-700",
  EXPIRED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  QUOTED: "معروض",
  PROPOSED: "مقترَح",
  ACCEPTED: "مقبول",
  EXPIRED: "منتهٍ",
  CANCELLED: "ملغى",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export default function FareQuotesPage() {
  const { can } = useAuth();
  const canManage = can("pricing.manage");
  const [form, setForm] = useState<SimForm>(EMPTY);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<FareQuoteRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const update = <K extends keyof SimForm>(key: K, value: SimForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const runSimulate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        rideClass: form.rideClass,
        pickupLat: Number(form.pickupLat),
        pickupLng: Number(form.pickupLng),
      };
      if (form.vehicleTypeId) body.vehicleTypeId = form.vehicleTypeId;
      if (form.cityId) body.cityId = form.cityId;
      if (form.destLat) body.destLat = Number(form.destLat);
      if (form.destLng) body.destLng = Number(form.destLng);
      if (form.distanceKm) body.distanceKm = Number(form.distanceKm);
      if (form.durationSec) body.durationSec = Number(form.durationSec);
      const { data } = await api.post<SimResult>(
        "/admin/fare-quotes/simulate",
        body,
      );
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [form]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const { data } = await api.get<FareQuoteRow[]>("/admin/fare-quotes", {
        params: { limit: 50 },
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(getApiErrorMessage(err));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) void loadList();
  }, [canManage, loadList]);

  return (
    <div>
      <Topbar title="عروض الأسعار التفاوضية" />

      <div className="space-y-6 p-6">
        <p className="text-sm text-gray-600">
          التسعير تفاوضي على نمط inDrive: يحصل الراكب على سعر مقترَح ونطاق تفاوض
          <span className="mx-1 font-semibold">[الحد الأدنى — الحد الأقصى]</span>
          ثم يقترح سعره ضمن النطاق. تعتمد الحدود على محرك التسعير
          (negotiationMin/Max) أو نطاق افتراضي حول السعر المقترَح. استخدم المحاكي
          أدناه لمعاينة النطاق دون حفظ أي بيانات.
        </p>

        {!canManage && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            هذه الصفحة تتطلب صلاحية «pricing.manage».
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-gray-900">
            محاكي نطاق التفاوض
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">فئة الرحلة</span>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.rideClass}
                onChange={(e) => update("rideClass", e.target.value)}
              >
                {RIDE_CLASSES.map((rc) => (
                  <option key={rc} value={rc}>
                    {rc}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">نوع المركبة (اختياري)</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.vehicleTypeId}
                onChange={(e) => update("vehicleTypeId", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">معرّف المدينة (اختياري)</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.cityId}
                onChange={(e) => update("cityId", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">مسافة يدوية كم (اختياري)</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.distanceKm}
                onChange={(e) => update("distanceKm", e.target.value)}
                placeholder="تُحسب من الإحداثيات إن تُركت فارغة"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">خط عرض الانطلاق</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.pickupLat}
                onChange={(e) => update("pickupLat", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">خط طول الانطلاق</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.pickupLng}
                onChange={(e) => update("pickupLng", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">خط عرض الوجهة</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.destLat}
                onChange={(e) => update("destLat", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">خط طول الوجهة</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.destLng}
                onChange={(e) => update("destLng", e.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={runSimulate}
              disabled={!canManage || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              محاكاة
            </button>
            <button
              type="button"
              onClick={() => setForm(EMPTY)}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
            >
              إعادة تعيين
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat
                  label="السعر المقترَح"
                  value={`${result.suggestedFare} ${result.currency}`}
                />
                <Stat
                  label="الحد الأدنى"
                  value={`${result.minFare} ${result.currency}`}
                />
                <Stat
                  label="الحد الأقصى"
                  value={`${result.maxFare} ${result.currency}`}
                />
                <Stat label="المسافة (كم)" value={result.distanceKm} />
              </div>
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                نطاق التفاوض المسموح للراكب:
                <span className="mx-1 font-bold">
                  {result.minFare} — {result.maxFare} {result.currency}
                </span>
                (المصدر: {result.pricingSource})
              </div>
              <details className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <summary className="cursor-pointer text-xs font-semibold text-gray-600">
                  تفاصيل حساب الأجرة
                </summary>
                <pre className="mt-2 overflow-auto text-xs">
                  {JSON.stringify(result.breakdown, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">أحدث العروض</h3>
            <button
              type="button"
              onClick={() => void loadList()}
              disabled={!canManage || listLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 disabled:opacity-50"
            >
              <RefreshCcw
                className={listLoading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
              />
              تحديث
            </button>
          </div>

          {listError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {listError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="px-3 py-2 font-medium">الحالة</th>
                  <th className="px-3 py-2 font-medium">الفئة</th>
                  <th className="px-3 py-2 font-medium">المقترَح</th>
                  <th className="px-3 py-2 font-medium">النطاق</th>
                  <th className="px-3 py-2 font-medium">سعر الراكب</th>
                  <th className="px-3 py-2 font-medium">الراكب</th>
                  <th className="px-3 py-2 font-medium">الرحلة</th>
                  <th className="px-3 py-2 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-gray-400"
                    >
                      {listLoading ? "جارٍ التحميل…" : "لا توجد عروض بعد."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            STATUS_STYLES[row.status] ??
                            "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{row.rideClass}</td>
                      <td className="px-3 py-2 text-gray-900">
                        {row.suggestedFare} {row.currency}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {row.minFare} — {row.maxFare}
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-900">
                        {row.proposedFare != null ? row.proposedFare : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">
                        {row.passengerId.slice(0, 8)}…
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">
                        {row.tripId ? `${row.tripId.slice(0, 8)}…` : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {new Date(row.createdAt).toLocaleString("ar")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-gray-400">
            <Scale className="h-3.5 w-3.5" />
            عروض السائقين المضادة (المزايدة) متاحة الآن من صفحة «عروض السائقين (المزايدة)».
          </p>
        </div>
      </div>
    </div>
  );
}
