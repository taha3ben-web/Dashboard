"use client";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plug,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { api, getApiErrorMessage } from "@/lib/api";
import { num } from "@/lib/format";

type Severity = "healthy" | "warning" | "critical";

interface Capabilities {
  checkout: boolean;
  capture: boolean;
  refund: boolean;
  cancel: boolean;
}

interface Provider {
  id?: string;
  key: string;
  label: string;
  enabled: boolean;
  methods: string[];
  webhookDriven: boolean;
  signatureScheme: string;
  protectionConfigured: boolean;
  capabilities: Capabilities;
}

interface WebhookHealth {
  severity: Severity;
  failureRatio: number;
  totalEvents: number;
  failedEvents: number;
  protectionConfigured: boolean;
  unprotected: boolean;
  stale: boolean;
  recommendations: string[];
  windowHours: number;
  lastEventAt: string | null;
  byProvider: Array<{ provider: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
  generatedAt: string;
}

interface RecentEvent {
  id: string;
  type: string;
  status: string | null;
  provider: string | null;
  reference: string | null;
  paymentId: string;
  createdAt: string;
}

const SEVERITY_STYLE: Record<Severity, { bg: string; text: string; label: string }> = {
  healthy: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "سليم" },
  warning: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "تحذير" },
  critical: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "حرِج" },
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  WALLET: "محفظة",
};

function yesNo(value: boolean): string {
  return value ? "نعم" : "لا";
}

function capsText(caps: Capabilities): string {
  const parts: string[] = [];
  if (caps.checkout) parts.push("دفع");
  if (caps.capture) parts.push("تحصيل");
  if (caps.refund) parts.push("استرداد");
  if (caps.cancel) parts.push("إلغاء");
  return parts.length ? parts.join(" · ") : "—";
}

export default function PaymentGatewaysPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [health, setHealth] = useState<WebhookHealth | null>(null);
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [providersRes, healthRes, eventsRes] = await Promise.all([
        api.get<Provider[]>("/dashboard/payments/gateways/providers"),
        api.get<WebhookHealth>("/dashboard/payments/gateways/webhook-health"),
        api.get<RecentEvent[]>("/dashboard/payments/gateways/recent-events"),
      ]);
      setProviders(providersRes.data);
      setHealth(healthRes.data);
      setEvents(eventsRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const style = health ? SEVERITY_STYLE[health.severity] : SEVERITY_STYLE.healthy;

  const providerColumns: Column<Provider>[] = [
    { key: "label", header: "المزوّد", render: (p) => <span className="font-medium">{p.label}</span> },
    { key: "key", header: "المفتاح", render: (p) => <code className="text-xs">{p.key}</code> },
    {
      key: "methods",
      header: "الطرق",
      render: (p) => p.methods.map((m) => METHOD_LABEL[m] ?? m).join(" · "),
    },
    { key: "enabled", header: "مُفعّل", render: (p) => yesNo(p.enabled) },
    {
      key: "signatureScheme",
      header: "توقيع webhook",
      render: (p) => (p.webhookDriven ? p.signatureScheme : "—"),
    },
    {
      key: "protectionConfigured",
      header: "حماية مضبوطة",
      render: (p) =>
        !p.webhookDriven ? (
          "—"
        ) : p.protectionConfigured ? (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <ShieldCheck className="h-4 w-4" /> نعم
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-700">
            <ShieldAlert className="h-4 w-4" /> لا
          </span>
        ),
    },
    { key: "capabilities", header: "القدرات", render: (p) => capsText(p.capabilities) },
  ];

  const eventColumns: Column<RecentEvent>[] = [
    {
      key: "createdAt",
      header: "الوقت",
      render: (e) => new Date(e.createdAt).toLocaleString("ar-DZ"),
    },
    { key: "provider", header: "المزوّد", render: (e) => e.provider ?? "—" },
    { key: "type", header: "النوع" },
    { key: "status", header: "الحالة", render: (e) => e.status ?? "—" },
    { key: "reference", header: "المرجع", render: (e) => e.reference ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <Topbar title="بوّابات الدفع" subtitle="سجلّ مزوّدي الدفع ورصد صحّة الـ webhooks" />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          تحديث
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {health && (
        <div className={`rounded-xl border p-4 ${style.bg}`}>
          <div className="flex items-center gap-2">
            {health.severity === "healthy" ? (
              <CheckCircle2 className={`h-5 w-5 ${style.text}`} />
            ) : (
              <AlertTriangle className={`h-5 w-5 ${style.text}`} />
            )}
            <span className={`font-semibold ${style.text}`}>صحّة الـ webhooks: {style.label}</span>
            {health.unprotected && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">غير محمي</span>
            )}
            {health.stale && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">راكد</span>
            )}
          </div>
          <ul className="mt-2 list-disc space-y-1 pr-5 text-sm text-gray-700">
            {health.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {health && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">أحداث ({health.windowHours}س)</div>
            <div className="mt-1 text-2xl font-semibold">{num(health.totalEvents)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">أحداث فاشلة</div>
            <div className="mt-1 text-2xl font-semibold">{num(health.failedEvents)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">نسبة الفشل</div>
            <div className="mt-1 text-2xl font-semibold">
              {num(Math.round(health.failureRatio * 1000) / 10)}%
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">آخر حدث</div>
            <div className="mt-1 text-sm font-medium">
              {health.lastEventAt
                ? new Date(health.lastEventAt).toLocaleString("ar-DZ")
                : "—"}
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Plug className="h-5 w-5" /> المزوّدون
        </h2>
        <DataTable
          columns={providerColumns}
          rows={providers}
          loading={loading}
          empty="لا يوجد مزوّدون"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">أحدث أحداث الدفع</h2>
        <DataTable
          columns={eventColumns}
          rows={events}
          loading={loading}
          empty="لا توجد أحداث"
        />
      </section>
    </div>
  );
}
