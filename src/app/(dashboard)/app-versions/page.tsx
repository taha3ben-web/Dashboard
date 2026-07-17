"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCcw, Trash2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

interface AppVersion {
  id: string;
  platform: string;
  appId?: string | null;
  clientOs?: string | null;
  countryCodes: string[];
  releaseChannel: string;
  status: "ACTIVE" | "PAUSED";
  version: string;
  minSupported?: string | null;
  forceUpdate: boolean;
  rolloutPercentage: number;
  releaseNotes?: string | null;
  updateTitle?: string | null;
  updateMessage?: string | null;
  url?: string | null;
  createdAt: string;
}

interface VersionForm {
  id: string | null;
  platform: string;
  appId: string;
  clientOs: string;
  countryCodesText: string;
  releaseChannel: string;
  status: "ACTIVE" | "PAUSED";
  version: string;
  minSupported: string;
  forceUpdate: boolean;
  rolloutPercentage: number;
  releaseNotes: string;
  updateTitle: string;
  updateMessage: string;
  url: string;
}

const EMPTY: VersionForm = {
  id: null,
  platform: "android",
  appId: "",
  clientOs: "android",
  countryCodesText: "",
  releaseChannel: "stable",
  status: "ACTIVE",
  version: "",
  minSupported: "",
  forceUpdate: false,
  rolloutPercentage: 100,
  releaseNotes: "",
  updateTitle: "",
  updateMessage: "",
  url: "",
};

function parseCsv(text: string, casing: "upper" | "lower" = "lower") {
  return Array.from(
    new Set(
      text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) =>
          casing === "upper" ? item.toUpperCase() : item.toLowerCase(),
        ),
    ),
  );
}

export default function AppVersionsPage() {
  const { can } = useAuth();
  const canManageSettings = can("settings.manage");
  const [rows, setRows] = useState<AppVersion[]>([]);
  const [form, setForm] = useState<VersionForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/app-versions");
      setRows(response.data ?? []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "تعذر تحميل سياسات الإصدارات"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(row: AppVersion) {
    setForm({
      id: row.id,
      platform: row.platform,
      appId: row.appId ?? "",
      clientOs: row.clientOs ?? "",
      countryCodesText: row.countryCodes.join(", "),
      releaseChannel: row.releaseChannel,
      status: row.status,
      version: row.version,
      minSupported: row.minSupported ?? "",
      forceUpdate: row.forceUpdate,
      rolloutPercentage: row.rolloutPercentage,
      releaseNotes: row.releaseNotes ?? "",
      updateTitle: row.updateTitle ?? "",
      updateMessage: row.updateMessage ?? "",
      url: row.url ?? "",
    });
    setError("");
    setSuccess("");
  }

  async function save() {
    if (!canManageSettings || !form.version.trim()) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        platform: form.platform,
        appId: form.appId.trim() || undefined,
        clientOs: form.clientOs.trim() || undefined,
        countryCodes: parseCsv(form.countryCodesText, "upper"),
        releaseChannel: form.releaseChannel.trim() || "stable",
        status: form.status,
        version: form.version.trim(),
        minSupported: form.minSupported.trim() || undefined,
        forceUpdate: form.forceUpdate,
        rolloutPercentage: form.rolloutPercentage,
        releaseNotes: form.releaseNotes.trim() || undefined,
        updateTitle: form.updateTitle.trim() || undefined,
        updateMessage: form.updateMessage.trim() || undefined,
        url: form.url.trim() || undefined,
      };
      if (form.id) {
        await api.patch(`/app-versions/${form.id}`, payload);
      } else {
        await api.post("/app-versions", payload);
      }
      setForm(EMPTY);
      setSuccess(
        form.id
          ? "تم تحديث سياسة الإصدار بنجاح."
          : "تم إنشاء سياسة إصدار جديدة بنجاح.",
      );
      await load();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "تعذر حفظ سياسة الإصدار"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!canManageSettings) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/app-versions/${id}`);
      setSuccess("تم حذف سياسة الإصدار.");
      if (form.id === id) setForm(EMPTY);
      await load();
    } catch (removeError) {
      setError(getApiErrorMessage(removeError, "تعذر حذف سياسة الإصدار"));
    }
  }

  const columns: Column<AppVersion>[] = [
    {
      key: "scope",
      header: "النطاق",
      render: (row) => (
        <div className="text-sm">
          <div className="font-semibold">{row.platform}</div>
          <div className="text-xs text-gray-500">
            {row.appId || "all apps"} · {row.clientOs || "all os"} ·{" "}
            {row.releaseChannel}
          </div>
          <div className="text-xs text-gray-500">
            {row.countryCodes.length > 0
              ? row.countryCodes.join(" / ")
              : "all markets"}
          </div>
        </div>
      ),
    },
    {
      key: "version",
      header: "الإصدار",
      render: (row) => (
        <div className="text-sm">
          <div className="font-semibold">{row.version}</div>
          <div className="text-xs text-gray-500">
            min: {row.minSupported ?? "-"}
          </div>
        </div>
      ),
    },
    {
      key: "policy",
      header: "السياسة",
      render: (row) => (
        <div className="min-w-32 text-sm">
          <div>{row.rolloutPercentage}% rollout</div>
          <div className="text-xs text-gray-500">
            {row.forceUpdate ? "forced when eligible" : "optional update"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (row) => (
        <div className="space-y-1">
          <StatusBadge status={row.status} />
          <div className="text-xs text-gray-500">{dateTime(row.createdAt)}</div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "الإجراءات",
      render: (row) =>
        canManageSettings ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => edit(row)}
              className="rounded-lg border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950"
            >
              تعديل
            </button>
            <button
              onClick={() => void remove(row.id)}
              className="flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
            >
              <Trash2 size={14} /> حذف
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">عرض فقط</span>
        ),
    },
  ];

  return (
    <>
      <Topbar title="حوكمة إصدارات التطبيق" />
      <div className="space-y-6 p-6">
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200">
          يمكنك الآن إدارة سياسات الإصدار حسب التطبيق، السوق، نظام التشغيل،
          وقناة النشر مع rollout تدريجي ورسائل تحديث مخصصة وربط مباشر مع{" "}
          <code>/public/config</code>.
        </section>

        {!canManageSettings ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذه الصفحة في وضع القراءة فقط لهذا الدور.
          </div>
        ) : null}

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

        {canManageSettings ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                {form.id ? "تعديل سياسة الإصدار" : "إضافة سياسة إصدار"}
              </h2>
              {form.id ? (
                <button
                  onClick={() => setForm(EMPTY)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                >
                  <RefreshCcw size={14} /> سياسة جديدة
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              >
                <option value="android">Android</option>
                <option value="ios">iOS</option>
                <option value="web">Web</option>
              </select>
              <input
                value={form.appId}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
                placeholder="appId مثل nova-passenger"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <input
                value={form.clientOs}
                onChange={(e) => setForm({ ...form, clientOs: e.target.value })}
                placeholder="clientOs مثل android"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <input
                value={form.releaseChannel}
                onChange={(e) =>
                  setForm({ ...form, releaseChannel: e.target.value })
                }
                placeholder="stable / beta / internal"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <input
                value={form.countryCodesText}
                onChange={(e) =>
                  setForm({ ...form, countryCodesText: e.target.value })
                }
                placeholder="DZ, SA, AE"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as "ACTIVE" | "PAUSED",
                  })
                }
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
              </select>
              <input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="الإصدار الحالي"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <input
                value={form.minSupported}
                onChange={(e) =>
                  setForm({ ...form, minSupported: e.target.value })
                }
                placeholder="أدنى إصدار مدعوم"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <label className="space-y-1 text-sm">
                <span>نسبة التفعيل: {form.rolloutPercentage}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.rolloutPercentage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      rolloutPercentage: Number(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.forceUpdate}
                  onChange={(e) =>
                    setForm({ ...form, forceUpdate: e.target.checked })
                  }
                />
                تحديث إجباري عند الأهلية
              </label>
              <input
                value={form.updateTitle}
                onChange={(e) =>
                  setForm({ ...form, updateTitle: e.target.value })
                }
                placeholder="عنوان التحديث"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="رابط المتجر / التحديث"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
              <textarea
                value={form.updateMessage}
                onChange={(e) =>
                  setForm({ ...form, updateMessage: e.target.value })
                }
                placeholder="رسالة التحديث للمستخدم"
                rows={3}
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <textarea
                value={form.releaseNotes}
                onChange={(e) =>
                  setForm({ ...form, releaseNotes: e.target.value })
                }
                placeholder="ملاحظات الإصدار الداخلية / العامة"
                rows={3}
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
            </div>
            <button
              onClick={() => void save()}
              disabled={saving || !form.version.trim()}
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              <Plus size={16} />
              {saving
                ? "جارٍ الحفظ..."
                : form.id
                  ? "حفظ التعديلات"
                  : "إضافة السياسة"}
            </button>
          </section>
        ) : null}

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          empty="لا توجد سياسات إصدار"
        />
      </div>
    </>
  );
}
