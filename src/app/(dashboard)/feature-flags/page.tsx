"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Power, Trash2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime } from "@/lib/format";

type Platform = "ALL" | "PASSENGER" | "DRIVER" | "DASHBOARD";

type RolloutStage = {
  startsAt: string;
  percentage: number;
  label?: string;
};

interface City {
  id: string;
  name: string;
  isActive: boolean;
}

interface FeatureFlagControl {
  key: string;
  globalKillSwitch: boolean;
  globalKillReason?: string | null;
}

interface FeatureFlag {
  id: string;
  key: string;
  description?: string | null;
  enabled: boolean;
  platform: Platform;
  cityIds: string[];
  countryCodes: string[];
  appIds: string[];
  clientOs: string[];
  audienceSegments: string[];
  rolloutPercentage: number;
  rolloutPlan?: RolloutStage[] | null;
  minAppVersion?: string | null;
  maxAppVersion?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  version: number;
  updatedAt: string;
}

interface FlagForm {
  open: boolean;
  id: string | null;
  key: string;
  description: string;
  enabled: boolean;
  platform: Platform;
  cityIds: string[];
  countryCodesText: string;
  appIdsText: string;
  clientOsText: string;
  audienceSegmentsText: string;
  rolloutPercentage: number;
  rolloutPlanText: string;
  minAppVersion: string;
  maxAppVersion: string;
  startsAt: string;
  endsAt: string;
}

const EMPTY_FORM: FlagForm = {
  open: false,
  id: null,
  key: "",
  description: "",
  enabled: false,
  platform: "ALL",
  cityIds: [],
  countryCodesText: "",
  appIdsText: "",
  clientOsText: "",
  audienceSegmentsText: "",
  rolloutPercentage: 100,
  rolloutPlanText: "",
  minAppVersion: "",
  maxAppVersion: "",
  startsAt: "",
  endsAt: "",
};

const PLATFORM_LABELS: Record<Platform, string> = {
  ALL: "كل التطبيقات",
  PASSENGER: "تطبيق الراكب",
  DRIVER: "تطبيق السائق",
  DASHBOARD: "لوحة التحكم",
};

function toLocalDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function parseCsv(text: string, casing: "none" | "upper" | "lower" = "none") {
  const values = text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(
    new Set(
      values.map((item) =>
        casing === "upper"
          ? item.toUpperCase()
          : casing === "lower"
            ? item.toLowerCase()
            : item,
      ),
    ),
  );
}

function toCsv(values: string[] | undefined | null) {
  return values?.join(", ") ?? "";
}

function parseRolloutPlan(text: string): RolloutStage[] | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const parsed: unknown = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) {
    throw new Error("خطة التدرج يجب أن تكون مصفوفة JSON");
  }
  return parsed.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("كل مرحلة يجب أن تكون كائن JSON");
    }
    const stage = item as {
      startsAt?: unknown;
      percentage?: unknown;
      label?: unknown;
    };
    if (typeof stage.startsAt !== "string") {
      throw new Error("startsAt مطلوب في كل مرحلة");
    }
    if (typeof stage.percentage !== "number") {
      throw new Error("percentage مطلوب في كل مرحلة");
    }
    return {
      startsAt: stage.startsAt,
      percentage: stage.percentage,
      ...(typeof stage.label === "string" && stage.label.trim()
        ? { label: stage.label.trim() }
        : {}),
    };
  });
}

function formatScope(flag: FeatureFlag) {
  const parts = [PLATFORM_LABELS[flag.platform]];
  if (flag.appIds.length > 0) parts.push(`apps ${flag.appIds.join(" / ")}`);
  if (flag.clientOs.length > 0) parts.push(`OS ${flag.clientOs.join(" / ")}`);
  if (flag.countryCodes.length > 0)
    parts.push(`أسواق ${flag.countryCodes.join(" / ")}`);
  if (flag.cityIds.length > 0) parts.push(`${flag.cityIds.length} مدن`);
  if (flag.audienceSegments.length > 0)
    parts.push(`شرائح ${flag.audienceSegments.join(" / ")}`);
  return parts.join(" · ");
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [control, setControl] = useState<FeatureFlagControl>({
    key: "global",
    globalKillSwitch: false,
    globalKillReason: "",
  });
  const [controlDraft, setControlDraft] = useState({
    globalKillSwitch: false,
    globalKillReason: "",
  });
  const [form, setForm] = useState<FlagForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [deleteFlag, setDeleteFlag] = useState<FeatureFlag | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [flagsResponse, citiesResponse, controlResponse] =
        await Promise.all([
          api.get("/feature-flags"),
          api.get("/cities"),
          api.get("/feature-flags/control"),
        ]);
      const nextControl = controlResponse.data as FeatureFlagControl;
      setFlags(flagsResponse.data ?? []);
      setCities(citiesResponse.data ?? []);
      setControl(nextControl);
      setControlDraft({
        globalKillSwitch: nextControl.globalKillSwitch,
        globalKillReason: nextControl.globalKillReason ?? "",
      });
      setError("");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "تعذّر تحميل لوحة الميزات"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredFlags = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return flags;
    return flags.filter(
      (flag) =>
        flag.key.toLowerCase().includes(query) ||
        (flag.description ?? "").toLowerCase().includes(query),
    );
  }, [flags, search]);

  function openEditor(flag?: FeatureFlag) {
    setForm(
      flag
        ? {
            open: true,
            id: flag.id,
            key: flag.key,
            description: flag.description ?? "",
            enabled: flag.enabled,
            platform: flag.platform,
            cityIds: flag.cityIds,
            countryCodesText: toCsv(flag.countryCodes),
            appIdsText: toCsv(flag.appIds),
            clientOsText: toCsv(flag.clientOs),
            audienceSegmentsText: toCsv(flag.audienceSegments),
            rolloutPercentage: flag.rolloutPercentage,
            rolloutPlanText: flag.rolloutPlan?.length
              ? JSON.stringify(flag.rolloutPlan, null, 2)
              : "",
            minAppVersion: flag.minAppVersion ?? "",
            maxAppVersion: flag.maxAppVersion ?? "",
            startsAt: toLocalDateTime(flag.startsAt),
            endsAt: toLocalDateTime(flag.endsAt),
          }
        : { ...EMPTY_FORM, open: true },
    );
  }

  async function save() {
    if (!form.key.trim()) return;
    setBusy("save");
    setError("");
    setSuccess("");
    try {
      const payload = {
        description: form.description.trim() || undefined,
        enabled: form.enabled,
        platform: form.platform,
        cityIds: form.cityIds,
        countryCodes: parseCsv(form.countryCodesText, "upper"),
        appIds: parseCsv(form.appIdsText, "lower"),
        clientOs: parseCsv(form.clientOsText, "lower"),
        audienceSegments: parseCsv(form.audienceSegmentsText, "lower"),
        rolloutPercentage: form.rolloutPercentage,
        rolloutPlan: parseRolloutPlan(form.rolloutPlanText),
        minAppVersion: form.minAppVersion.trim() || undefined,
        maxAppVersion: form.maxAppVersion.trim() || undefined,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };
      if (form.id) {
        await api.patch(`/feature-flags/${form.id}`, payload);
      } else {
        await api.post("/feature-flags", {
          ...payload,
          key: form.key.trim(),
        });
      }
      setForm(EMPTY_FORM);
      setSuccess("تم حفظ مفتاح الميزة وتحديث نسخة التكوين.");
      await load();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "تعذّر حفظ مفتاح الميزة"));
    } finally {
      setBusy("");
    }
  }

  async function saveControl() {
    setBusy("control");
    setError("");
    setSuccess("");
    try {
      await api.patch("/feature-flags/control", {
        globalKillSwitch: controlDraft.globalKillSwitch,
        globalKillReason: controlDraft.globalKillReason.trim() || null,
      });
      setSuccess(
        controlDraft.globalKillSwitch
          ? "تم تفعيل مفتاح الإيقاف العام لكل الميزات."
          : "تم تحديث حالة الإيقاف العام للميزات.",
      );
      await load();
    } catch (controlError) {
      setError(getApiErrorMessage(controlError, "تعذّر تحديث مفتاح الطوارئ"));
    } finally {
      setBusy("");
    }
  }

  async function toggle(flag: FeatureFlag) {
    setBusy(`toggle:${flag.id}`);
    setError("");
    try {
      await api.patch(`/feature-flags/${flag.id}`, {
        enabled: !flag.enabled,
      });
      setSuccess(flag.enabled ? "تم إيقاف الميزة فورًا." : "تم تفعيل الميزة.");
      await load();
    } catch (toggleError) {
      setError(getApiErrorMessage(toggleError, "تعذّر تغيير حالة الميزة"));
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!deleteFlag) return;
    setBusy("delete");
    try {
      await api.delete(`/feature-flags/${deleteFlag.id}`);
      setDeleteFlag(null);
      setSuccess("تم حذف مفتاح الميزة.");
      await load();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, "تعذّر حذف مفتاح الميزة"));
      throw deleteError;
    } finally {
      setBusy("");
    }
  }

  function toggleCity(cityId: string) {
    setForm((current) => ({
      ...current,
      cityIds: current.cityIds.includes(cityId)
        ? current.cityIds.filter((id) => id !== cityId)
        : [...current.cityIds, cityId],
    }));
  }

  const columns: Column<FeatureFlag>[] = [
    {
      key: "key",
      header: "المفتاح",
      render: (flag) => (
        <div>
          <div className="font-mono font-semibold">{flag.key}</div>
          <div className="max-w-80 text-xs text-gray-500">
            {flag.description || "بدون وصف"}
          </div>
        </div>
      ),
    },
    {
      key: "scope",
      header: "الاستهداف",
      render: (flag) => (
        <div className="max-w-80 text-sm">
          <div>{formatScope(flag)}</div>
          {flag.minAppVersion || flag.maxAppVersion ? (
            <div className="text-xs text-gray-500">
              إصدارات: {flag.minAppVersion ?? "أي إصدار"} →{" "}
              {flag.maxAppVersion ?? "بلا حد أعلى"}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "rollout",
      header: "التوزيع",
      render: (flag) => (
        <div className="min-w-36">
          <div className="text-sm font-semibold">
            {flag.rolloutPercentage}%
            {flag.rolloutPlan?.length
              ? ` · ${flag.rolloutPlan.length} مراحل`
              : ""}
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full bg-brand"
              style={{ width: `${flag.rolloutPercentage}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "الجدولة",
      render: (flag) => (
        <div className="text-xs">
          <div>من: {flag.startsAt ? dateTime(flag.startsAt) : "فورًا"}</div>
          <div>إلى: {flag.endsAt ? dateTime(flag.endsAt) : "بدون نهاية"}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (flag) => (
        <span
          className={
            flag.enabled
              ? "rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700"
              : "rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800"
          }
        >
          {flag.enabled ? "مفعّل" : "متوقف"} · v{flag.version}
        </span>
      ),
    },
    {
      key: "actions",
      header: "الإجراءات",
      render: (flag) => (
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => void toggle(flag)}
            disabled={busy === `toggle:${flag.id}`}
            className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-700 disabled:opacity-50"
          >
            <Power size={13} /> {flag.enabled ? "إيقاف" : "تفعيل"}
          </button>
          <button
            onClick={() => openEditor(flag)}
            className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-700"
          >
            تعديل
          </button>
          <button
            onClick={() => setDeleteFlag(flag)}
            className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-xs text-red-700"
          >
            <Trash2 size={13} /> حذف
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Topbar title="مفاتيح الميزات والتحكم المتقدم" />
      <div className="space-y-5 p-4 sm:p-6">
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-200">
          التطبيقات تقرأ النتيجة المحسوبة من <code>/public/config</code>. يمكن
          الآن استهداف الميزة حسب التطبيق، السوق، المدينة، نظام التشغيل،
          الشرائح، وحدود الإصدار، مع خطة تدرج متعددة المراحل ومفتاح إيقاف عام.
        </section>

        {success ? (
          <div className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                مفتاح الإيقاف العام
              </h2>
              <p className="text-sm text-amber-800/80 dark:text-amber-200/80">
                عند التفعيل يتم تعطيل جميع Feature Flags في التقييم العام دون
                حذف إعداداتها.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
              <input
                type="checkbox"
                checked={controlDraft.globalKillSwitch}
                onChange={(event) =>
                  setControlDraft((current) => ({
                    ...current,
                    globalKillSwitch: event.target.checked,
                  }))
                }
              />
              تفعيل الإيقاف العام
            </label>
          </div>
          <textarea
            value={controlDraft.globalKillReason}
            onChange={(event) =>
              setControlDraft((current) => ({
                ...current,
                globalKillReason: event.target.value,
              }))
            }
            rows={2}
            placeholder="سبب الإيقاف — يظهر للفرق ويعاد مع نتيجة التقييم"
            className="w-full rounded-lg border border-amber-300 px-3 py-2 dark:border-amber-900 dark:bg-gray-900"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900/70 dark:text-amber-200/70">
            <span>
              الحالة الحالية: {control.globalKillSwitch ? "مفعل" : "متوقف"}
            </span>
            <button
              onClick={() => void saveControl()}
              disabled={busy === "control"}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy === "control" ? "جارٍ الحفظ..." : "حفظ حالة الطوارئ"}
            </button>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالمفتاح أو الوصف"
              className="min-w-72 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <button
              onClick={() => openEditor()}
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              <Plus size={16} /> مفتاح ميزة جديد
            </button>
          </div>
          <DataTable
            columns={columns}
            rows={filteredFlags}
            loading={loading}
            empty="لا توجد مفاتيح ميزات"
          />
        </section>
      </div>

      <Modal
        open={form.open}
        onClose={() => setForm(EMPTY_FORM)}
        title={form.id ? "تعديل مفتاح الميزة" : "إنشاء مفتاح ميزة"}
        footer={
          <>
            <button
              onClick={() => setForm(EMPTY_FORM)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void save()}
              disabled={busy === "save" || !form.key.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy === "save" ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <input
            value={form.key}
            disabled={Boolean(form.id)}
            onChange={(event) => setForm({ ...form, key: event.target.value })}
            placeholder="مثال: passenger.scheduled-rides"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900"
          />
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder="وصف واضح لتأثير الميزة"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>التطبيق الأساسي</span>
              <select
                value={form.platform}
                onChange={(event) =>
                  setForm({
                    ...form,
                    platform: event.target.value as Platform,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              >
                {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>نسبة التوزيع الحالية: {form.rolloutPercentage}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={form.rolloutPercentage}
                onChange={(event) =>
                  setForm({
                    ...form,
                    rolloutPercentage: Number(event.target.value),
                  })
                }
                className="w-full"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>appIds — مفصولة بفواصل</span>
              <input
                value={form.appIdsText}
                onChange={(event) =>
                  setForm({ ...form, appIdsText: event.target.value })
                }
                placeholder="nova-passenger, nova-driver"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>أنظمة التشغيل — مفصولة بفواصل</span>
              <input
                value={form.clientOsText}
                onChange={(event) =>
                  setForm({ ...form, clientOsText: event.target.value })
                }
                placeholder="android, ios, web"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>الأسواق / الدول — مفصولة بفواصل</span>
              <input
                value={form.countryCodesText}
                onChange={(event) =>
                  setForm({ ...form, countryCodesText: event.target.value })
                }
                placeholder="DZ, MA, TN"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>الشرائح — مفصولة بفواصل</span>
              <input
                value={form.audienceSegmentsText}
                onChange={(event) =>
                  setForm({
                    ...form,
                    audienceSegmentsText: event.target.value,
                  })
                }
                placeholder="beta, vip, staff-pilot"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>أدنى إصدار تطبيق</span>
              <input
                value={form.minAppVersion}
                onChange={(event) =>
                  setForm({ ...form, minAppVersion: event.target.value })
                }
                placeholder="1.8.0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>أعلى إصدار تطبيق</span>
              <input
                value={form.maxAppVersion}
                onChange={(event) =>
                  setForm({ ...form, maxAppVersion: event.target.value })
                }
                placeholder="2.3.5"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>بداية التفعيل</span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) =>
                  setForm({ ...form, startsAt: event.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>نهاية التفعيل</span>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) =>
                  setForm({ ...form, endsAt: event.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">
              المدن — اتركها فارغة لتطبيقها على جميع المدن
            </div>
            <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3 md:grid-cols-2 dark:border-gray-800">
              {cities.map((city) => (
                <label
                  key={city.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.cityIds.includes(city.id)}
                    onChange={() => toggleCity(city.id)}
                  />
                  {city.name}
                  {!city.isActive ? (
                    <span className="text-xs text-amber-600">معطلة</span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">
              خطة التدرج متعددة المراحل
            </div>
            <textarea
              value={form.rolloutPlanText}
              onChange={(event) =>
                setForm({ ...form, rolloutPlanText: event.target.value })
              }
              rows={6}
              placeholder='[{"startsAt":"2026-07-15T09:00:00.000Z","percentage":10,"label":"pilot"},{"startsAt":"2026-07-18T09:00:00.000Z","percentage":50}]'
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">
              عند وجود خطة مراحل، ستحدد النسبة الفعّالة حسب آخر مرحلة حان وقتها.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) =>
                setForm({ ...form, enabled: event.target.checked })
              }
            />
            تفعيل المفتاح بعد الحفظ
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteFlag)}
        title="حذف مفتاح الميزة"
        message={
          deleteFlag
            ? `سيتم حذف ${deleteFlag.key}. أوقفه بدل الحذف إذا كان التطبيق ما زال يستخدم المفتاح.`
            : ""
        }
        tone="danger"
        confirmLabel="حذف"
        onCancel={() => setDeleteFlag(null)}
        onConfirm={remove}
      />
    </>
  );
}
