"use client";

import { useCallback, useState } from "react";
import { Boxes, RefreshCcw } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

interface PreviewForm {
  platform: string;
  version: string;
  appId: string;
  clientOs: string;
  countryCode: string;
  cityId: string;
  releaseChannel: string;
  audience: "" | "passenger" | "driver" | "all";
  role: string;
  subjectId: string;
  segments: string;
  locale: string;
}

const EMPTY: PreviewForm = {
  platform: "android",
  version: "1.0.0",
  appId: "",
  clientOs: "android",
  countryCode: "",
  cityId: "",
  releaseChannel: "stable",
  audience: "passenger",
  role: "PASSENGER",
  subjectId: "",
  segments: "",
  locale: "ar",
};

interface BootstrapPayload {
  generatedAt: string;
  configVersion: number;
  user: {
    id: string | null;
    role: string | null;
    audience: string;
    authenticated: boolean;
  };
  app: {
    platform: string | null;
    version: string | null;
    releaseChannel: string | null;
    versionPolicy: Record<string, unknown> | null;
  };
  config: Record<string, unknown>;
  maps: {
    provider: string;
    clientApiKey: string | null;
    defaultCountry: string | null;
    averageSpeedKmh: number;
  };
  legal: {
    documents: Array<Record<string, unknown>>;
    consent: {
      pending: Array<Record<string, unknown>>;
      accepted: Array<Record<string, unknown>>;
    };
  };
  catalog: { version: number; categories: Array<Record<string, unknown>> };
  featureFlags: {
    values: Record<string, boolean>;
    globalKillSwitchEnabled: boolean;
    globalKillReason: string | null;
    evaluatedAt: string;
  };
  emergencyContacts: Array<Record<string, unknown>>;
  savedPlaces: Array<Record<string, unknown>>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-bold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

export default function BootstrapPreviewPage() {
  const { can } = useAuth();
  const canManage = can("settings.manage");
  const [form, setForm] = useState<PreviewForm>(EMPTY);
  const [payload, setPayload] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof PreviewForm>(key: K, value: PreviewForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const runPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "" && value != null) params[key] = String(value);
      });
      const { data } = await api.get<BootstrapPayload>("/admin/bootstrap/preview", {
        params,
      });
      setPayload(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [form]);

  const flagEntries = payload ? Object.entries(payload.featureFlags.values) : [];

  return (
    <div>
      <Topbar title="تهيئة التطبيق" />

      <div className="space-y-6 p-4 sm:p-6">
        <p className="text-sm text-gray-600">
          معاينة الحمولة الموحّدة التي يستلمها التطبيق عند الإقلاع من نقطة
          <span className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
            GET /bootstrap
          </span>
          . اضبط السياق ثم اضغط «معاينة» لرؤية النتيجة الفعلية دون التأثير على أي بيانات.
        </p>

        {!canManage && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            هذه الصفحة للقراءة فقط. تحتاج صلاحية «settings.manage» لتشغيل المعاينة.
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">المنصة</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.platform}
                onChange={(e) => update("platform", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">الإصدار</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.version}
                onChange={(e) => update("version", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">معرّف التطبيق (appId)</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.appId}
                onChange={(e) => update("appId", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">نظام العميل</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.clientOs}
                onChange={(e) => update("clientOs", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">رمز الدولة</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.countryCode}
                onChange={(e) => update("countryCode", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">معرّف المدينة</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.cityId}
                onChange={(e) => update("cityId", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">قناة الإصدار</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.releaseChannel}
                onChange={(e) => update("releaseChannel", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">الجمهور</span>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.audience}
                onChange={(e) =>
                  update("audience", e.target.value as PreviewForm["audience"])
                }
              >
                <option value="passenger">راكب</option>
                <option value="driver">سائق</option>
                <option value="all">الكل</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">الدور (role)</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">معرّف المستخدم (subjectId)</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.subjectId}
                onChange={(e) => update("subjectId", e.target.value)}
                placeholder="اختياري — لعرض الطوارئ والأماكن والموافقات"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">الشرائح (بفاصلة)</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.segments}
                onChange={(e) => update("segments", e.target.value)}
                placeholder="vip,beta"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">اللغة</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.locale}
                onChange={(e) => update("locale", e.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={runPreview}
              disabled={!canManage || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              معاينة
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
        </div>

        {payload && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="رقم إصدار الإعدادات" value={payload.configVersion} />
              <Stat label="الجمهور المُحتسب" value={payload.user.audience} />
              <Stat
                label="تحديث إجباري؟"
                value={
                  payload.app.versionPolicy?.updateRequired ? "نعم" : "لا"
                }
              />
              <Stat label="مزوّد الخرائط" value={payload.maps.provider} />
            </div>

            <Section title="سياسة الإصدار">
              {payload.app.versionPolicy ? (
                <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
                  {JSON.stringify(payload.app.versionPolicy, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-gray-500">
                  لم يتم إرسال منصة/إصدار — لا توجد سياسة إصدار.
                </p>
              )}
            </Section>

            <Section title={`مفاتيح الميزات (${flagEntries.length})`}>
              {payload.featureFlags.globalKillSwitchEnabled && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  مفتاح الإيقاف الطارئ العام مُفعّل
                  {payload.featureFlags.globalKillReason
                    ? ` — ${payload.featureFlags.globalKillReason}`
                    : ""}
                </div>
              )}
              {flagEntries.length === 0 ? (
                <p className="text-sm text-gray-500">لا توجد مفاتيح مفعّلة.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {flagEntries.map(([key, value]) => (
                    <span
                      key={key}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        value
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {key}: {value ? "مُفعّل" : "مُعطّل"}
                    </span>
                  ))}
                </div>
              )}
            </Section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Section
                title={`المستندات القانونية (${payload.legal.documents.length}) — معلّقة: ${payload.legal.consent.pending.length}`}
              >
                <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
                  {JSON.stringify(payload.legal, null, 2)}
                </pre>
              </Section>

              <Section title="إعداد الخرائط العام">
                <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
                  {JSON.stringify(payload.maps, null, 2)}
                </pre>
              </Section>

              <Section
                title={`الكتالوج — فئات: ${payload.catalog.categories.length} (إصدار ${payload.catalog.version})`}
              >
                <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
                  {JSON.stringify(payload.catalog.categories, null, 2)}
                </pre>
              </Section>

              <Section
                title={`جهات الطوارئ (${payload.emergencyContacts.length}) والأماكن المحفوظة (${payload.savedPlaces.length})`}
              >
                <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
                  {JSON.stringify(
                    {
                      emergencyContacts: payload.emergencyContacts,
                      savedPlaces: payload.savedPlaces,
                    },
                    null,
                    2,
                  )}
                </pre>
              </Section>
            </div>

            <Section title="الإعدادات العامة">
              <pre className="max-h-80 overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
                {JSON.stringify(payload.config, null, 2)}
              </pre>
            </Section>

            <p className="flex items-center gap-2 text-xs text-gray-400">
              <Boxes className="h-3.5 w-3.5" />
              وُلّدت في {payload.generatedAt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
