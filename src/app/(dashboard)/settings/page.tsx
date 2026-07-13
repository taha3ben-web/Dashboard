"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Save, Settings2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";

interface Setting {
  id: string;
  key: string;
  value: unknown;
  group?: string | null;
  updatedAt: string;
}

interface City {
  id: string;
  name: string;
  country?: string | null;
  isActive: boolean;
  centerLat?: number | null;
  centerLng?: number | null;
  _count?: { zones: number; drivers: number; trips: number };
}

interface Zone {
  id: string;
  cityId: string;
  name: string;
  polygon?: unknown;
  city?: { id: string; name: string };
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function parseValue(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return text;
  }
}

function parseJsonObject(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const parsed = JSON.parse(trimmed);
  return typeof parsed === "object" && parsed !== null
    ? (parsed as Record<string, unknown>)
    : undefined;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [error, setError] = useState("");

  const [cityForm, setCityForm] = useState({
    name: "",
    country: "DZ",
    centerLat: "",
    centerLng: "",
    isActive: true,
  });
  const [zoneForm, setZoneForm] = useState({
    cityId: "",
    name: "",
    polygon: '{"type":"Polygon","coordinates":[]}',
  });

  const loadSettings = useCallback(() => {
    api
      .get("/settings")
      .then((response) => {
        const list: Setting[] = response.data ?? [];
        setSettings(list);
        const map: Record<string, string> = {};
        for (const item of list) map[item.key] = toText(item.value);
        setDrafts(map);
      })
      .catch(() => setSettings([]));
  }, []);

  const loadCities = useCallback(() => {
    api
      .get("/cities")
      .then((response) => {
        const items: City[] = response.data ?? [];
        setCities(items);
        setSelectedCityId((current) => current || items[0]?.id || "");
        setZoneForm((current) => ({
          ...current,
          cityId: current.cityId || items[0]?.id || "",
        }));
      })
      .catch(() => setCities([]));
  }, []);

  const loadZones = useCallback((cityId: string) => {
    if (!cityId) {
      setZones([]);
      return;
    }
    api
      .get("/zones", { params: { cityId } })
      .then((response) => setZones(response.data ?? []))
      .catch(() => setZones([]));
  }, []);

  const load = useCallback(() => {
    setError("");
    loadSettings();
    loadCities();
  }, [loadCities, loadSettings]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadZones(selectedCityId);
  }, [loadZones, selectedCityId]);

  async function saveSetting(key: string) {
    try {
      await api.put(`/settings/${encodeURIComponent(key)}`, {
        value: parseValue(drafts[key] ?? ""),
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(""), 1500);
      loadSettings();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "تعذّر حفظ الإعداد"));
    }
  }

  async function createCity() {
    try {
      await api.post("/cities", {
        name: cityForm.name,
        country: cityForm.country || undefined,
        isActive: cityForm.isActive,
        centerLat: cityForm.centerLat ? Number(cityForm.centerLat) : undefined,
        centerLng: cityForm.centerLng ? Number(cityForm.centerLng) : undefined,
      });
      setCityForm({
        name: "",
        country: "DZ",
        centerLat: "",
        centerLng: "",
        isActive: true,
      });
      loadCities();
    } catch (createError) {
      setError(getApiErrorMessage(createError, "تعذّر إنشاء المدينة"));
    }
  }

  async function toggleCity(city: City) {
    try {
      await api.patch(`/cities/${city.id}`, { isActive: !city.isActive });
      loadCities();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث المدينة"));
    }
  }

  async function deleteCity(cityId: string) {
    if (!window.confirm("حذف المدينة؟")) return;
    try {
      await api.delete(`/cities/${cityId}`);
      loadCities();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر حذف المدينة"));
    }
  }

  async function createZone() {
    try {
      await api.post("/zones", {
        cityId: zoneForm.cityId,
        name: zoneForm.name,
        polygon: parseJsonObject(zoneForm.polygon),
      });
      setZoneForm((current) => ({
        ...current,
        name: "",
        polygon: '{"type":"Polygon","coordinates":[]}',
      }));
      loadZones(zoneForm.cityId);
    } catch (createError) {
      setError(getApiErrorMessage(createError, "تعذّر إنشاء المنطقة"));
    }
  }

  async function deleteZone(zoneId: string) {
    if (!window.confirm("حذف المنطقة؟")) return;
    try {
      await api.delete(`/zones/${zoneId}`);
      loadZones(selectedCityId);
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر حذف المنطقة"));
    }
  }

  const cityColumns: Column<City>[] = [
    { key: "name", header: "المدينة", render: (city) => <b>{city.name}</b> },
    { key: "country", header: "الدولة", render: (city) => city.country ?? "-" },
    {
      key: "counts",
      header: "الارتباطات",
      render: (city) =>
        `مناطق ${city._count?.zones ?? 0} · سائقون ${city._count?.drivers ?? 0} · رحلات ${city._count?.trips ?? 0}`,
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (city) => <StatusBadge status={city.isActive ? "ACTIVE" : "OFFLINE"} />,
    },
    {
      key: "actions",
      header: "إجراءات",
      render: (city) => (
        <div className="flex gap-1">
          <button
            onClick={() => setSelectedCityId(city.id)}
            className="rounded bg-brand/10 px-2 py-1 text-xs text-brand"
          >
            اختيار
          </button>
          <button
            onClick={() => void toggleCity(city)}
            className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-600"
          >
            {city.isActive ? "تعطيل" : "تفعيل"}
          </button>
          <button
            onClick={() => void deleteCity(city.id)}
            className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600"
          >
            حذف
          </button>
        </div>
      ),
    },
  ];

  const zoneColumns: Column<Zone>[] = [
    { key: "name", header: "المنطقة", render: (zone) => <b>{zone.name}</b> },
    {
      key: "city",
      header: "المدينة",
      render: (zone) =>
        cities.find((city) => city.id === zone.cityId)?.name ?? zone.city?.name ?? "-",
    },
    {
      key: "polygon",
      header: "Polygon",
      render: (zone) =>
        zone.polygon ? `${JSON.stringify(zone.polygon).slice(0, 60)}...` : "-",
    },
    {
      key: "actions",
      header: "إجراءات",
      render: (zone) => (
        <button
          onClick={() => void deleteZone(zone.id)}
          className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600"
        >
          حذف
        </button>
      ),
    },
  ];

  const selectedCityName = useMemo(
    () => cities.find((city) => city.id === selectedCityId)?.name ?? "-",
    [cities, selectedCityId],
  );

  return (
    <>
      <Topbar title="الإعدادات والمدن والمناطق" />
      <div className="space-y-8 p-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-bold">إعدادات النظام</h2>
          {settings.length === 0 ? (
            <p className="text-sm text-gray-500">
              لا توجد إعدادات بعد. تُضاف من الخادم أو عبر التهيئة الأولية.
            </p>
          ) : (
            <div className="space-y-2">
              {settings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="min-w-40">
                    <div className="text-sm font-medium">{setting.key}</div>
                    {setting.group ? (
                      <div className="text-xs text-gray-400">{setting.group}</div>
                    ) : null}
                  </div>
                  <input
                    value={drafts[setting.key] ?? ""}
                    onChange={(event) =>
                      setDrafts({ ...drafts, [setting.key]: event.target.value })
                    }
                    className="flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
                  />
                  <button
                    onClick={() => void saveSetting(setting.key)}
                    className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white"
                  >
                    <Save size={14} />
                    {savedKey === setting.key ? "تم ✓" : "حفظ"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Settings2 size={18} className="text-brand" />
              <h2 className="text-lg font-bold">المدن</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              <input
                value={cityForm.name}
                onChange={(event) => setCityForm({ ...cityForm, name: event.target.value })}
                placeholder="اسم المدينة"
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
              <input
                value={cityForm.country}
                onChange={(event) => setCityForm({ ...cityForm, country: event.target.value })}
                placeholder="الدولة"
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
              <input
                value={cityForm.centerLat}
                onChange={(event) => setCityForm({ ...cityForm, centerLat: event.target.value })}
                placeholder="centerLat"
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
              <input
                value={cityForm.centerLng}
                onChange={(event) => setCityForm({ ...cityForm, centerLng: event.target.value })}
                placeholder="centerLng"
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                onClick={() => void createCity()}
                disabled={!cityForm.name}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                إنشاء مدينة
              </button>
            </div>
            <DataTable columns={cityColumns} rows={cities} empty="لا توجد مدن" />
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">المناطق</h2>
              <div className="text-sm text-gray-500">
                المدينة المختارة: {selectedCityName}
              </div>
            </div>
            <div className="grid gap-3">
              <select
                value={zoneForm.cityId}
                onChange={(event) => {
                  setZoneForm({ ...zoneForm, cityId: event.target.value });
                  setSelectedCityId(event.target.value);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">اختر المدينة</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              <input
                value={zoneForm.name}
                onChange={(event) => setZoneForm({ ...zoneForm, name: event.target.value })}
                placeholder="اسم المنطقة"
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
              <textarea
                value={zoneForm.polygon}
                onChange={(event) => setZoneForm({ ...zoneForm, polygon: event.target.value })}
                rows={5}
                placeholder='{"type":"Polygon","coordinates":[...]}'
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                onClick={() => void createZone()}
                disabled={!zoneForm.cityId || !zoneForm.name}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                إنشاء منطقة
              </button>
            </div>
            <DataTable columns={zoneColumns} rows={zones} empty="لا توجد مناطق لهذه المدينة" />
          </div>
        </section>
      </div>
    </>
  );
}
