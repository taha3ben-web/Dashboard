"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HandCoins, RefreshCcw } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

interface FareOfferRow {
  id: string;
  fareQuoteId: string;
  driverId: string;
  amount: number;
  currency: string;
  note: string | null;
  etaMinutes: number | null;
  status: string;
  respondedAt: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-gray-100 text-gray-500",
  EXPIRED: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "معلّق",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  WITHDRAWN: "مسحوب",
  EXPIRED: "منتهٍ",
};

const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "EXPIRED",
];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export default function FareOffersPage() {
  const { can } = useAuth();
  const canManage = can("pricing.manage");

  const [rows, setRows] = useState<FareOfferRow[]>([]);
  const [status, setStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (status !== "ALL") params.status = status;
      const { data } = await api.get<FareOfferRow[]>("/admin/fare-offers", {
        params,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => r.status === "PENDING").length;
    const accepted = rows.filter((r) => r.status === "ACCEPTED").length;
    return { total, pending, accepted };
  }, [rows]);

  return (
    <div>
      <Topbar title="عروض السائقين (المزايدة)" />

      <div className="space-y-6 p-6">
        <p className="text-sm text-gray-600">
          بعد أن يطلب الراكب عرض سعر تفاوضيًا، يقدّم السائقون
          <span className="mx-1 font-semibold">عروضًا مضادة</span>
          (سعر + زمن وصول تقديري)، ثم يقبل الراكب عرضًا واحدًا فتُرفض بقية العروض
          المعلّقة تلقائيًا. هذه الصفحة لمعاينة وتدقيق حركة المزايدة (قراءة فقط).
        </p>

        {!canManage && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            هذه الصفحة تتطلب صلاحية «pricing.manage».
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Stat label="إجمالي العروض المعروضة" value={stats.total} />
          <Stat label="معلّقة" value={stats.pending} />
          <Stat label="مقبولة" value={stats.accepted} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-gray-900">عروض السائقين</h3>
            <div className="flex items-center gap-3">
              <select
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? "كل الحالات" : STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void load()}
                disabled={!canManage || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 disabled:opacity-50"
              >
                <RefreshCcw
                  className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
                />
                تحديث
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="px-3 py-2 font-medium">الحالة</th>
                  <th className="px-3 py-2 font-medium">قيمة العرض</th>
                  <th className="px-3 py-2 font-medium">زمن الوصول</th>
                  <th className="px-3 py-2 font-medium">السائق</th>
                  <th className="px-3 py-2 font-medium">عرض السعر</th>
                  <th className="px-3 py-2 font-medium">ملاحظة</th>
                  <th className="px-3 py-2 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-gray-400"
                    >
                      {loading ? "جارٍ التحميل…" : "لا توجد عروض بعد."}
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
                      <td className="px-3 py-2 font-semibold text-gray-900">
                        {row.amount} {row.currency}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {row.etaMinutes != null ? `${row.etaMinutes} د` : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">
                        {row.driverId.slice(0, 8)}…
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">
                        {row.fareQuoteId.slice(0, 8)}…
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2 text-gray-500">
                        {row.note ?? "—"}
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
            <HandCoins className="h-3.5 w-3.5" />
            قبول عرض سائق يُنشئ رحلة بالسعر المتفَق (بحالة ACCEPTED)، ويقفل عرض السعر، ويرفض بقية العروض المعلّقة. تصل عروض السائقين وقرارات القبول/الرفض فوريًا إلى تطبيقَي الراكب والسائق عبر WebSocket. وتُنهى صلاحية العروض المعلّقة تلقائيًا بعد دقيقتين وتُعلَّم «منتهٍ» مع إشعار الطرفين. كما تُرسَل إشعارات Push للطرفين لتصل حتى والتطبيق مغلق.
          </p>
        </div>
      </div>
    </div>
  );
}
