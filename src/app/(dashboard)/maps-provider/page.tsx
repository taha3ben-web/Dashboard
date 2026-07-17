"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, RefreshCcw, Save } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

interface ProviderConfig {
  provider: string;
  supportedProviders: string[];
  defaultCountry: string;
  averageSpeedKmh: number;
  hasServerApiKey: boolean;
  hasClientApiKey: boolean;
  serverApiKeyHint: string;
  clientApiKeyHint: string;
  defaults: { provider: string; averageSpeedKmh: number };
}

interface ProviderForm {
  provider: string;
  defaultCountry: string;
  averageSpeedKmh: number;
  serverApiKey: string;
  clientApiKey: string;
}

export default function MapsProviderPage() {
  const { can } = useAuth();
  const canManageSettings = can("settings.manage");
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [form, setForm] = useState<ProviderForm>({
    provider: "internal",
    defaultCountry: "",
    averageSpeedKmh: 30,
    serverApiKey: "",
    clientApiKey: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const applyConfig = useCallback((data: ProviderConfig) => {
    setConfig(data);
    setForm({
      provider: data.provider,
      defaultCountry: data.defaultCountry ?? "",
      averageSpeedKmh: data.averageSpeedKmh,
      serverApiKey: "",
      clientApiKey: "",
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<ProviderConfig>("/admin/geo/provider");
      applyConfig(response.data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "تعذر تحميل إعدادات مزوّد الخرائط"));
    } finally {
      setLoading(false);
    }
  }, [applyConfig]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!canManageSettings) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload: Record<string, unknown> = {
        provider: form.provider,
        defaultCountry: form.defaultCountry.trim(),
        averageSpeedKmh: form.averageSpeedKmh,
      };
      if (form.serverApiKey.trim()) payload.serverApiKey = form.serverApiKey.trim();
      if (form.clientApiKey.trim()) payload.clientApiKey = form.clientApiKey.trim();
      const response = await api.put<{ config: ProviderConfig }>(
        "/admin/geo/provider",
        payload,
      );
      applyConfig(response.data.config);
      setSuccess("تم حفظ إعدادات مزوّد الخرائط بنجاح.");
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "تعذر حفظ الإعدادات"));
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700";

  return (
    <>
      <Topbar title="مزوّد الخرائط والمواقع" />
      <div className="space-y-6 p-6">
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200">
          يُدير هذا القسم مزوّد الخرائط المستخدم خلف الباكند (إكمال
          العناوين، التحويل الجغرافي، حساب المسارات). الوضع الافتراضي{" "}
          <code>internal</code> يعمل دون مفاتيح ودون اتصال خارجي. المفاتيح
          السرية لا تُعرض أبدًا بعد حفظها (تُقنّع).
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

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <MapPin size={18} /> إعدادات المزوّد
            </h2>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
            >
              <RefreshCcw size={14} /> تحديث
            </button>
          </div>

          {config ? (
            <div className="mb-4 grid grid-cols-1 gap-2 text-xs text-gray-500 md:grid-cols-3">
              <div>
                المزوّد الحالي:{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {config.provider}
                </span>
              </div>
              <div>
                مفتاح الخادم:{" "}
                <span className="font-mono">
                  {config.hasServerApiKey ? config.serverApiKeyHint : "—"}
                </span>
              </div>
              <div>
                مفتاح العميل:{" "}
                <span className="font-mono">
                  {config.hasClientApiKey ? config.clientApiKeyHint : "—"}
                </span>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300">المزوّد</span>
              <select
                value={form.provider}
                disabled={!canManageSettings}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className={inputClass}
              >
                {(config?.supportedProviders ?? ["internal", "google"]).map(
                  (provider) => (
                    <option key={provider} value={provider}>
                      {provider === "internal"
                        ? "internal (داخلي offline)"
                        : provider}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                الدولة الافتراضية (ISO)
              </span>
              <input
                value={form.defaultCountry}
                disabled={!canManageSettings}
                onChange={(e) =>
                  setForm({ ...form, defaultCountry: e.target.value })
                }
                placeholder="DZ"
                className={inputClass}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                متوسط السرعة (كم/س) — لحساب الزمن الداخلي
              </span>
              <input
                type="number"
                min={5}
                max={200}
                value={form.averageSpeedKmh}
                disabled={!canManageSettings}
                onChange={(e) =>
                  setForm({
                    ...form,
                    averageSpeedKmh: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                مفتاح الخادم (server key) — سري
              </span>
              <input
                type="password"
                value={form.serverApiKey}
                disabled={!canManageSettings}
                onChange={(e) =>
                  setForm({ ...form, serverApiKey: e.target.value })
                }
                placeholder={
                  config?.hasServerApiKey
                    ? "اتركه فارغًا للإبقاء على المفتاح الحالي"
                    : "أدخل مفتاح الخادم"
                }
                className={inputClass}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                مفتاح العميل (client key)
              </span>
              <input
                type="password"
                value={form.clientApiKey}
                disabled={!canManageSettings}
                onChange={(e) =>
                  setForm({ ...form, clientApiKey: e.target.value })
                }
                placeholder={
                  config?.hasClientApiKey
                    ? "اتركه فارغًا للإبقاء على المفتاح الحالي"
                    : "أدخل مفتاح العميل"
                }
                className={inputClass}
              />
            </label>
          </div>

          {canManageSettings ? (
            <button
              onClick={() => void save()}
              disabled={saving}
              className="mt-5 inline-flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              <Save size={16} />
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </button>
          ) : null}
        </section>
      </div>
    </>
  );
}
