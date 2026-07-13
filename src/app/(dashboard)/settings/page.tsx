"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe2, Settings2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { num } from "@/lib/format";
import { SettingsPanel } from "./SettingsPanel";
import {
  SettingsModals,
  emptyCityForm,
  emptySettingForm,
  emptyZoneForm,
} from "./SettingsModals";
import type {
  City,
  CityForm,
  DeleteTarget,
  Setting,
  SettingForm,
  Zone,
  ZoneForm,
} from "./settings.types";

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function parseValue(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return "";
  try {
    return JSON.parse(trimmed);
  } catch {
    return text;
  }
}

function parsePolygon(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const parsed: unknown = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Polygon يجب أن يكون JSON object صالحًا");
  }
  return parsed as Record<string, unknown>;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirtyKeys, setDirtyKeys] = useState<string[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [settingSearch, setSettingSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [settingForm, setSettingForm] =
    useState<SettingForm>(emptySettingForm());
  const [cityForm, setCityForm] = useState<CityForm>(emptyCityForm());
  const [zoneForm, setZoneForm] = useState<ZoneForm>(emptyZoneForm());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const response = await api.get("/settings");
      const list: Setting[] = response.data ?? [];
      setSettings(list);
      const map: Record<string, string> = {};
      for (const item of list)
        map[item.key] = item.masked ? "" : toText(item.value);
      setDrafts(map);
      setDirtyKeys([]);
      setError("");
    } catch (loadError) {
      setSettings([]);
      setDrafts({});
      setError(getApiErrorMessage(loadError, "تعذّر تحميل إعدادات النظام"));
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadCities = useCallback(async () => {
    setCitiesLoading(true);
    try {
      const response = await api.get("/cities");
      const items: City[] = response.data ?? [];
      setCities(items);
      setSelectedCityId((current) =>
        items.some((city) => city.id === current)
          ? current
          : (items[0]?.id ?? ""),
      );
      setError("");
    } catch (loadError) {
      setCities([]);
      setSelectedCityId("");
      setError(getApiErrorMessage(loadError, "تعذّر تحميل المدن"));
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  const loadZones = useCallback(async (cityId: string) => {
    if (!cityId) {
      setZones([]);
      return;
    }
    setZonesLoading(true);
    try {
      const response = await api.get("/zones", { params: { cityId } });
      setZones(response.data ?? []);
      setError("");
    } catch (loadError) {
      setZones([]);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل المناطق"));
    } finally {
      setZonesLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadSettings(), loadCities()]);
  }, [loadSettings, loadCities]);

  useEffect(() => {
    void loadZones(selectedCityId);
  }, [loadZones, selectedCityId]);

  const groups = useMemo(
    () =>
      Array.from(
        new Set(settings.map((setting) => setting.group || "بدون مجموعة")),
      ).sort(),
    [settings],
  );
  const filteredSettings = useMemo(() => {
    const query = settingSearch.trim().toLowerCase();
    return settings.filter((setting) => {
      const matchesGroup =
        !groupFilter || (setting.group || "بدون مجموعة") === groupFilter;
      const matchesSearch =
        !query ||
        setting.key.toLowerCase().includes(query) ||
        (setting.group ?? "").toLowerCase().includes(query);
      return matchesGroup && matchesSearch;
    });
  }, [settings, settingSearch, groupFilter]);
  const selectedCityName =
    cities.find((city) => city.id === selectedCityId)?.name ?? "-";

  const clearFeedback = () => {
    setError("");
    setSuccess("");
  };

  function updateDraft(key: string, value: string) {
    setDrafts((current) => ({ ...current, [key]: value }));
    setDirtyKeys((current) =>
      current.includes(key) ? current : [...current, key],
    );
  }

  async function saveInlineSetting(key: string) {
    const setting = settings.find((item) => item.key === key);
    if (!setting) return;
    clearFeedback();
    setBusyAction(`setting:${key}`);
    try {
      await api.put(`/settings/${encodeURIComponent(key)}`, {
        value:
          setting.isSensitive && !(drafts[key] ?? "").trim()
            ? undefined
            : parseValue(drafts[key] ?? ""),
      });
      setSuccess(`تم حفظ ${key} ورفع نسخة الإعدادات.`);
      await loadSettings();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "تعذّر حفظ الإعداد"));
    } finally {
      setBusyAction("");
    }
  }

  async function saveAllDirty() {
    const items = settings
      .filter((setting) => dirtyKeys.includes(setting.key))
      .filter(
        (setting) => !setting.isSensitive || (drafts[setting.key] ?? "").trim(),
      )
      .map((setting) => ({
        key: setting.key,
        group: setting.group || undefined,
        value: parseValue(drafts[setting.key] ?? ""),
        isPublic: setting.isPublic,
        isSensitive: setting.isSensitive,
      }));
    if (items.length === 0) return;
    clearFeedback();
    setBusyAction("bulk-settings");
    try {
      await api.post("/settings/bulk", { items });
      setSuccess(`تم حفظ ${items.length} إعدادات ورفع نسخة التكوين.`);
      await loadSettings();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "تعذّر حفظ الإعدادات"));
    } finally {
      setBusyAction("");
    }
  }

  function openSettingEditor(setting?: Setting) {
    if (!setting) {
      setSettingForm({ ...emptySettingForm(), open: true });
      return;
    }
    setSettingForm({
      open: true,
      originalKey: setting.key,
      key: setting.key,
      group: setting.group ?? "",
      value: setting.masked ? "" : toText(setting.value),
      isPublic: setting.isPublic,
      isSensitive: setting.isSensitive,
      hasStoredSecret: Boolean(setting.masked && setting.hasValue),
    });
  }

  async function saveSettingForm() {
    clearFeedback();
    setBusyAction("setting");
    try {
      const payload = {
        value:
          settingForm.isSensitive &&
          settingForm.hasStoredSecret &&
          !settingForm.value.trim()
            ? undefined
            : parseValue(settingForm.value),
        group: settingForm.group || undefined,
        isPublic: settingForm.isPublic,
        isSensitive: settingForm.isSensitive,
      };
      if (settingForm.originalKey) {
        await api.put(
          `/settings/${encodeURIComponent(settingForm.originalKey)}`,
          payload,
        );
      } else {
        await api.post("/settings", { ...payload, key: settingForm.key });
      }
      setSettingForm(emptySettingForm());
      setSuccess("تم حفظ الإعداد وتحديث نسخة Public Config.");
      await loadSettings();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "تعذّر حفظ الإعداد"));
    } finally {
      setBusyAction("");
    }
  }

  function openCityEditor(city?: City) {
    setCityForm(
      city
        ? {
            open: true,
            id: city.id,
            name: city.name,
            country: city.country ?? "",
            centerLat: city.centerLat?.toString() ?? "",
            centerLng: city.centerLng?.toString() ?? "",
            isActive: city.isActive,
          }
        : { ...emptyCityForm(), open: true },
    );
  }

  async function saveCity() {
    const payload = {
      name: cityForm.name,
      country: cityForm.country || undefined,
      isActive: cityForm.isActive,
      centerLat: cityForm.centerLat ? Number(cityForm.centerLat) : undefined,
      centerLng: cityForm.centerLng ? Number(cityForm.centerLng) : undefined,
    };
    clearFeedback();
    setBusyAction("city");
    try {
      if (cityForm.id) await api.patch(`/cities/${cityForm.id}`, payload);
      else await api.post("/cities", payload);
      setCityForm(emptyCityForm());
      setSuccess("تم حفظ المدينة وتحديث التكوين المتاح للتطبيقات.");
      await loadCities();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "تعذّر حفظ المدينة"));
    } finally {
      setBusyAction("");
    }
  }

  async function toggleCity(city: City) {
    clearFeedback();
    setBusyAction(`city:${city.id}`);
    try {
      await api.patch(`/cities/${city.id}`, { isActive: !city.isActive });
      setSuccess(city.isActive ? "تم تعطيل المدينة." : "تم تفعيل المدينة.");
      await loadCities();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث المدينة"));
    } finally {
      setBusyAction("");
    }
  }

  function openZoneEditor(zone?: Zone) {
    setZoneForm(
      zone
        ? {
            open: true,
            id: zone.id,
            cityId: zone.cityId,
            name: zone.name,
            polygon: toText(zone.polygon),
          }
        : { ...emptyZoneForm(selectedCityId), open: true },
    );
  }

  async function saveZone() {
    let polygon: Record<string, unknown> | undefined;
    try {
      polygon = parsePolygon(zoneForm.polygon);
    } catch (parseError) {
      setError(
        parseError instanceof Error ? parseError.message : "Polygon غير صالح",
      );
      return;
    }
    clearFeedback();
    setBusyAction("zone");
    try {
      const payload = { cityId: zoneForm.cityId, name: zoneForm.name, polygon };
      if (zoneForm.id) await api.patch(`/zones/${zoneForm.id}`, payload);
      else await api.post("/zones", payload);
      const targetCityId = zoneForm.cityId;
      setZoneForm(emptyZoneForm());
      setSelectedCityId(targetCityId);
      setSuccess("تم حفظ المنطقة وتحديث التكوين المتاح للتطبيقات.");
      await loadZones(targetCityId);
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "تعذّر حفظ المنطقة"));
    } finally {
      setBusyAction("");
    }
  }

  async function deleteSelected() {
    if (!deleteTarget) return;
    clearFeedback();
    setBusyAction("delete");
    try {
      if (deleteTarget.type === "setting") {
        await api.delete(`/settings/${encodeURIComponent(deleteTarget.id)}`);
        await loadSettings();
      } else if (deleteTarget.type === "city") {
        await api.delete(`/cities/${deleteTarget.id}`);
        await loadCities();
      } else {
        await api.delete(`/zones/${deleteTarget.id}`);
        await loadZones(selectedCityId);
      }
      setDeleteTarget(null);
      setSuccess("تم الحذف وتحديث نسخة التكوين.");
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, "تعذّر الحذف"));
      throw deleteError;
    } finally {
      setBusyAction("");
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
      render: (city) => (
        <StatusBadge status={city.isActive ? "ACTIVE" : "OFFLINE"} />
      ),
    },
    {
      key: "actions",
      header: "إجراءات",
      render: (city) => (
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedCityId(city.id)}
            className="rounded bg-brand/10 px-2 py-1 text-xs text-brand"
          >
            المناطق
          </button>
          <button
            onClick={() => openCityEditor(city)}
            className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600"
          >
            تعديل
          </button>
          <button
            disabled={busyAction === `city:${city.id}`}
            onClick={() => void toggleCity(city)}
            className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-600"
          >
            {city.isActive ? "تعطيل" : "تفعيل"}
          </button>
          <button
            onClick={() =>
              setDeleteTarget({
                type: "city",
                id: city.id,
                label: `مدينة ${city.name}`,
              })
            }
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
        zone.city?.name ??
        cities.find((city) => city.id === zone.cityId)?.name ??
        "-",
    },
    {
      key: "polygon",
      header: "Polygon",
      render: (zone) =>
        zone.polygon ? `${JSON.stringify(zone.polygon).slice(0, 70)}...` : "-",
    },
    {
      key: "actions",
      header: "إجراءات",
      render: (zone) => (
        <div className="flex gap-1">
          <button
            onClick={() => openZoneEditor(zone)}
            className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600"
          >
            تعديل
          </button>
          <button
            onClick={() =>
              setDeleteTarget({
                type: "zone",
                id: zone.id,
                label: `منطقة ${zone.name}`,
              })
            }
            className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600"
          >
            حذف
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Topbar title="الإعدادات والمدن والمناطق" />
      <div className="space-y-6 p-6">
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900/40 dark:bg-cyan-950/20">
          <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
            <Globe2 size={18} />
            <span className="font-medium">
              الخادم هو مصدر الحقيقة، والتطبيقات تقرأ الإعدادات العامة من GET
              /public/config
            </span>
          </div>
          <div className="mt-1 text-sm text-cyan-700/80 dark:text-cyan-300/80">
            الإعدادات: {num(settings.length)} · المدن: {num(cities.length)} ·
            مناطق المدينة المختارة: {num(zones.length)}
          </div>
        </div>

        {success ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <SettingsPanel
          settings={filteredSettings}
          drafts={drafts}
          dirtyKeys={dirtyKeys}
          search={settingSearch}
          setSearch={setSettingSearch}
          groupFilter={groupFilter}
          setGroupFilter={setGroupFilter}
          groups={groups}
          loading={settingsLoading}
          busyAction={busyAction}
          updateDraft={updateDraft}
          openEditor={openSettingEditor}
          saveOne={saveInlineSetting}
          saveAll={saveAllDirty}
          refresh={loadSettings}
          remove={(setting) =>
            setDeleteTarget({
              type: "setting",
              id: setting.key,
              label: `الإعداد ${setting.key}`,
            })
          }
        />

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 size={18} className="text-brand" />
                <h2 className="text-lg font-bold">المدن</h2>
              </div>
              <button
                onClick={() => openCityEditor()}
                className="rounded-lg bg-brand px-3 py-2 text-sm text-white"
              >
                مدينة جديدة
              </button>
            </div>
            <DataTable
              columns={cityColumns}
              rows={cities}
              loading={citiesLoading}
              empty="لا توجد مدن"
            />
          </div>
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">المناطق</h2>
                <div className="text-sm text-gray-500">
                  المدينة: {selectedCityName}
                </div>
              </div>
              <button
                onClick={() => openZoneEditor()}
                disabled={!selectedCityId}
                className="rounded-lg bg-brand px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                منطقة جديدة
              </button>
            </div>
            <DataTable
              columns={zoneColumns}
              rows={zones}
              loading={zonesLoading}
              empty="لا توجد مناطق لهذه المدينة"
            />
          </div>
        </section>
      </div>

      <SettingsModals
        settingForm={settingForm}
        setSettingForm={setSettingForm}
        saveSetting={saveSettingForm}
        cityForm={cityForm}
        setCityForm={setCityForm}
        saveCity={saveCity}
        zoneForm={zoneForm}
        setZoneForm={setZoneForm}
        cities={cities}
        saveZone={saveZone}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        deleteSelected={deleteSelected}
        busyAction={busyAction}
      />
    </>
  );
}
