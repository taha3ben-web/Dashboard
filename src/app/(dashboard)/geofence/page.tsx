"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { MapPin, Search } from "lucide-react";

interface ZoneHit {
  id: string;
  name: string;
  cityId: string;
}
interface AreaHit {
  id: string;
  name: string;
  city?: string | null;
}
interface ResolveResult {
  point: { lat: number; lng: number };
  zones: ZoneHit[];
  serviceAreas: AreaHit[];
  serviceable: boolean;
}

export default function GeofencePage() {
  const { can } = useAuth();
  const allowed = can("settings.manage") || can("pricing.manage");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [cityId, setCityId] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function resolve() {
    setError(null);
    setResult(null);
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      setError("أدخل إحداثيات صحيحة (خط العرض والطول).");
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, unknown> = { lat: latN, lng: lngN };
      if (cityId.trim()) params.cityId = cityId.trim();
      const r = await api.get("/geofence/resolve", { params });
      setResult(r.data);
    } catch {
      setError("تعذّر حسم الموقع. تحقق من الصلاحيات والإحداثيات.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Topbar title="السياج الجغرافي" />
      <div className="space-y-6 p-4 sm:p-6">
        {!allowed ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذه الصفحة تتطلّب صلاحية إدارة الإعدادات أو التسعير.
          </div>
        ) : null}

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-brand" />
            <h3 className="font-bold">حسم نقطة داخل الأحياء ومناطق الخدمة</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="خط العرض (lat)"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="خط الطول (lng)"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <input
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              placeholder="معرّف المدينة (اختياري)"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <button
            onClick={resolve}
            disabled={loading || !allowed}
            className="mt-4 flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Search size={16} /> حسم الموقع
          </button>
          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
        </div>

        {result ? (
          <div className="space-y-4">
            <div
              className={
                result.serviceable
                  ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                  : "rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
              }
            >
              {result.serviceable
                ? "النقطة ضمن منطقة خدمة فعّالة."
                : "النقطة خارج جميع مناطق الخدمة الفعّالة."}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h4 className="mb-3 font-bold">
                الأحياء المحتوية ({result.zones.length})
              </h4>
              {result.zones.length ? (
                <ul className="space-y-1 text-sm">
                  {result.zones.map((z) => (
                    <li
                      key={z.id}
                      className="flex justify-between border-b border-gray-100 py-1 dark:border-gray-800"
                    >
                      <span>{z.name}</span>
                      <span className="text-xs text-gray-400">{z.cityId}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">لا يوجد حي يحتوي هذه النقطة.</p>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h4 className="mb-3 font-bold">
                مناطق الخدمة المحتوية ({result.serviceAreas.length})
              </h4>
              {result.serviceAreas.length ? (
                <ul className="space-y-1 text-sm">
                  {result.serviceAreas.map((a) => (
                    <li
                      key={a.id}
                      className="flex justify-between border-b border-gray-100 py-1 dark:border-gray-800"
                    >
                      <span>{a.name}</span>
                      <span className="text-xs text-gray-400">{a.city ?? ""}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">
                  لا توجد منطقة خدمة تحتوي هذه النقطة.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
