"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Siren,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/providers/AuthProvider";
import { getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";
import {
  loadOpsSnapshot,
  opsActions,
  type DeadLetterRow,
  type OpsPanel,
  type OpsSeverity,
  type OpsSnapshot,
  type ReconciliationIncidentRow,
  type RiskReviewRow,
  type SettlementRow,
} from "@/lib/ops";

type Tab = "settlements" | "deadLetters" | "incidents" | "risk";

const PANELS: Record<
  string,
  {
    label: string;
    icon: ReactNode;
    tab: Tab;
    accent: "green" | "amber" | "red" | "blue";
  }
> = {
  settlement: {
    label: "طابور التسويات",
    icon: <CircleDollarSign size={18} />,
    tab: "settlements",
    accent: "blue",
  },
  deadLetters: {
    label: "الرسائل الميتة",
    icon: <Siren size={18} />,
    tab: "deadLetters",
    accent: "red",
  },
  reconciliation: {
    label: "حوادث المطابقة",
    icon: <AlertTriangle size={18} />,
    tab: "incidents",
    accent: "amber",
  },
  risk: {
    label: "مراجعات المخاطر",
    icon: <ShieldAlert size={18} />,
    tab: "risk",
    accent: "amber",
  },
};

export default function OperationsPage() {
  const { can } = useAuth();
  const canManage = can("payments.manage");
  const [snapshot, setSnapshot] = useState<OpsSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("settlements");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      setSnapshot(await loadOpsSnapshot());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "تعذّر تحميل مركز العمليات"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const runAction = useCallback(
    async (key: string, action: () => Promise<unknown>, success: string) => {
      if (busyAction) return;
      setBusyAction(key);
      setError("");
      setNotice("");
      try {
        await action();
        setNotice(success);
        await load(true);
      } catch (actionError) {
        setError(getApiErrorMessage(actionError, "تعذّر تنفيذ الإجراء"));
      } finally {
        setBusyAction(null);
      }
    },
    [busyAction, load],
  );

  const panelByKey = useMemo(
    () =>
      new Map(
        (snapshot?.overview.health.panels ?? []).map((panel) => [
          panel.key,
          panel,
        ]),
      ),
    [snapshot],
  );

  const settlements: Column<SettlementRow>[] = [
    {
      key: "id",
      header: "الرحلة",
      render: (row) => <code className="text-xs">{row.id.slice(0, 10)}</code>,
    },
    {
      key: "passenger",
      header: "الراكب / السائق",
      render: (row) => (
        <div>
          <div className="font-semibold">{row.passenger?.name ?? "-"}</div>
          <div className="text-xs text-slate-500">
            {row.driver?.user?.name ?? "دون سائق"}
          </div>
        </div>
      ),
    },
    {
      key: "fare",
      header: "القيمة",
      render: (row) => `${num(Number(row.fare ?? 0))} ${row.currency ?? ""}`,
    },
    {
      key: "settlementStatus",
      header: "الحالة",
      render: (row) => (
        <StatusBadge status={row.settlementStatus ?? "PENDING"} />
      ),
    },
    {
      key: "settlementAttempts",
      header: "المحاولات",
      render: (row) => num(row.settlementAttempts),
    },
    {
      key: "settlementError",
      header: "آخر خطأ",
      className: "max-w-xs",
      render: (row) => (
        <span
          className="block max-w-xs truncate text-red-500"
          title={row.settlementError ?? ""}
        >
          {row.settlementError ?? "-"}
        </span>
      ),
    },
    {
      key: "completedAt",
      header: "اكتملت",
      render: (row) => dateTime(row.completedAt),
    },
  ];

  const deadLetters: Column<DeadLetterRow>[] = [
    {
      key: "name",
      header: "الحدث",
      render: (row) => <span className="font-semibold">{row.name}</span>,
    },
    {
      key: "status",
      header: "الحالة",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "attempts",
      header: "المحاولات",
      render: (row) => `${row.attempts}/${row.maxAttempts}`,
    },
    {
      key: "lastError",
      header: "الخطأ",
      className: "max-w-sm",
      render: (row) => (
        <span
          className="block max-w-sm truncate text-red-500"
          title={row.lastError ?? ""}
        >
          {row.lastError ?? "-"}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "آخر تحديث",
      render: (row) => dateTime(row.updatedAt),
    },
    {
      key: "action",
      header: "إجراء",
      render: (row) =>
        canManage ? (
          <ActionButton
            busy={busyAction === `dlq:${row.id}`}
            disabled={Boolean(busyAction)}
            onClick={() =>
              void runAction(
                `dlq:${row.id}`,
                () => opsActions.retryDeadLetter(row.id),
                "أُعيدت جدولة الرسالة بنجاح",
              )
            }
          >
            إعادة المحاولة
          </ActionButton>
        ) : (
          <ReadOnly />
        ),
    },
  ];

  const incidents: Column<ReconciliationIncidentRow>[] = [
    {
      key: "accountCode",
      header: "الحساب",
      render: (row) => <code className="text-xs">{row.accountCode}</code>,
    },
    {
      key: "cachedBalance",
      header: "المخزن",
      render: (row) => num(Number(row.cachedBalance)),
    },
    {
      key: "derivedBalance",
      header: "المشتق",
      render: (row) => num(Number(row.derivedBalance)),
    },
    {
      key: "difference",
      header: "الفرق",
      render: (row) => (
        <span className="font-bold text-red-500">
          {num(Number(row.difference))} {row.currency}
        </span>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "اكتُشف",
      render: (row) => dateTime(row.createdAt),
    },
    {
      key: "action",
      header: "إجراء",
      render: (row) =>
        canManage ? (
          <ActionButton
            busy={busyAction === `incident:${row.id}`}
            disabled={Boolean(busyAction)}
            onClick={() =>
              void runAction(
                `incident:${row.id}`,
                () => opsActions.resolveIncident(row.id),
                "تم إغلاق حادثة المطابقة",
              )
            }
          >
            تم الحل
          </ActionButton>
        ) : (
          <ReadOnly />
        ),
    },
  ];

  const risk: Column<RiskReviewRow>[] = [
    { key: "subjectKind", header: "النوع" },
    {
      key: "subjectId",
      header: "الهدف",
      render: (row) => (
        <code className="text-xs">{row.subjectId.slice(0, 12)}</code>
      ),
    },
    { key: "action", header: "الإجراء" },
    {
      key: "score",
      header: "الخطورة",
      render: (row) => (
        <span
          className={
            row.score >= 80
              ? "font-black text-red-500"
              : "font-bold text-amber-500"
          }
        >
          {row.score}/100
        </span>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "أُنشئت",
      render: (row) => dateTime(row.createdAt),
    },
  ];

  return (
    <>
      <Topbar title="مركز العمليات" />
      <main className="space-y-6 p-4 sm:p-6">
        <header className="rounded-2xl border border-slate-200 bg-gradient-to-l from-white to-indigo-50 p-5 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:to-indigo-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <SeverityBadge
                  severity={snapshot?.overview.health.severity ?? "OK"}
                />
                <span className="text-xs text-slate-500">
                  تحديث تلقائي كل 30 ثانية
                </span>
              </div>
              <h1 className="text-xl font-black">Operational Control Plane</h1>
              <p className="mt-1 text-sm text-slate-500">
                التسويات وDLQ ومطابقة Ledger والمخاطر من نقطة واحدة.
              </p>
            </div>
            <button
              onClick={() => void load(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <RefreshCcw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              تحديث
            </button>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            آخر لقطة: {dateTime(snapshot?.overview.generatedAt)}
          </div>
        </header>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"
          >
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
            <CheckCircle2 size={17} /> {notice}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(PANELS).map(([key, meta]) => {
            const panel = panelByKey.get(key);
            return (
              <button
                key={key}
                onClick={() => setActiveTab(meta.tab)}
                className="text-right"
              >
                <StatCard
                  label={meta.label}
                  value={num(sumMetrics(panel))}
                  icon={meta.icon}
                  accent={accentForSeverity(panel?.severity, meta.accent)}
                  hint={severityLabel(panel?.severity ?? "OK")}
                />
              </button>
            );
          })}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black">الرؤية التشغيلية الحية</h2>
              <p className="text-sm text-slate-500">رحلات وسائقون ودعم وبنية تحتية من لقطة التشغيل الحالية.</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className={snapshot?.realtime.health.db.ok ? "rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-700" : "rounded-full bg-red-100 px-2.5 py-1 font-bold text-red-700"}>DB {snapshot?.realtime.health.db.ok ? "OK" : "FAIL"}</span>
              <span className={snapshot?.realtime.health.redis.ok ? "rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-700" : "rounded-full bg-red-100 px-2.5 py-1 font-bold text-red-700"}>Redis {snapshot?.realtime.health.redis.ok ? "OK" : "FAIL"}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <LiveMetric label="سائقون Online" value={snapshot?.realtime.queues.onlineDrivers} />
            <LiveMetric label="سائقون مشغولون" value={snapshot?.realtime.queues.busyDrivers} />
            <LiveMetric label="رحلات نشطة" value={snapshot?.realtime.queues.activeTrips} />
            <LiveMetric label="مواقع سائقين" value={snapshot?.realtime.queues.driversWithGeo} />
            <LiveMetric label="تذاكر مفتوحة" value={snapshot?.realtime.queues.openTickets} alert />
            <LiveMetric label="شكاوى مفتوحة" value={snapshot?.realtime.queues.openComplaints} alert />
            <LiveMetric label="سحوبات معلقة" value={snapshot?.realtime.queues.pendingWithdrawals} alert />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b text-right text-xs text-slate-500 dark:border-gray-800"><th className="p-2">أحدث الرحلات</th><th className="p-2">الراكب</th><th className="p-2">السائق</th><th className="p-2">الحالة</th><th className="p-2">الوقت</th></tr></thead>
              <tbody>{(snapshot?.realtime.recentTrips ?? []).map((trip) => <tr key={trip.id} className="border-b dark:border-gray-800"><td className="p-2 font-mono text-xs">{trip.id.slice(0, 10)}</td><td className="p-2">{trip.passenger?.name ?? "-"}</td><td className="p-2">{trip.driver?.user?.name ?? "-"}</td><td className="p-2"><StatusBadge status={trip.status} /></td><td className="p-2 text-xs text-slate-500">{dateTime(trip.createdAt)}</td></tr>)}</tbody>
            </table>
            {(snapshot?.realtime.recentTrips ?? []).length === 0 ? <p className="p-3 text-sm text-slate-500">لا توجد رحلات حديثة.</p> : null}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <Tabs
            active={activeTab}
            onChange={setActiveTab}
            snapshot={snapshot}
          />
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <ActionButton
                busy={busyAction === "retry-settlements"}
                disabled={Boolean(busyAction)}
                onClick={() =>
                  void runAction(
                    "retry-settlements",
                    opsActions.retryFailedSettlements,
                    "اكتملت دفعة إعادة محاولة التسويات",
                  )
                }
              >
                <RotateCcw size={14} /> إعادة التسويات الفاشلة
              </ActionButton>
              <ActionButton
                busy={busyAction === "reconcile"}
                disabled={Boolean(busyAction)}
                onClick={() =>
                  void runAction(
                    "reconcile",
                    opsActions.runReconciliation,
                    "اكتمل فحص مطابقة Ledger",
                  )
                }
              >
                <Activity size={14} /> تشغيل المطابقة
              </ActionButton>
            </div>
          ) : (
            <span className="text-xs text-slate-400">
              وضع القراءة فقط — تتطلب الإجراءات payments.manage
            </span>
          )}
        </section>

        {activeTab === "settlements" ? (
          <DataTable
            columns={settlements}
            rows={snapshot?.settlements.items ?? []}
            loading={loading}
            empty="لا توجد رحلات بانتظار التسوية"
          />
        ) : null}
        {activeTab === "deadLetters" ? (
          <DataTable
            columns={deadLetters}
            rows={snapshot?.deadLetters.items ?? []}
            loading={loading}
            empty="لا توجد رسائل في DLQ"
          />
        ) : null}
        {activeTab === "incidents" ? (
          <DataTable
            columns={incidents}
            rows={snapshot?.incidents.items ?? []}
            loading={loading}
            empty="لا توجد حوادث مطابقة مفتوحة"
          />
        ) : null}
        {activeTab === "risk" ? (
          <DataTable
            columns={risk}
            rows={snapshot?.riskReviews ?? []}
            loading={loading}
            empty="لا توجد مراجعات مخاطر مفتوحة"
          />
        ) : null}
      </main>
    </>
  );
}

function LiveMetric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value?: number;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-gray-800">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={alert && Number(value ?? 0) > 0 ? "mt-1 text-xl font-black text-amber-600" : "mt-1 text-xl font-black"}>
        {num(value)}
      </div>
    </div>
  );
}

function sumMetrics(panel?: OpsPanel): number {
  return panel
    ? Object.values(panel.metrics).reduce((sum, value) => sum + value, 0)
    : 0;
}

function severityLabel(severity: OpsSeverity): string {
  return severity === "CRITICAL"
    ? "حرج"
    : severity === "WARN"
      ? "تحذير"
      : "سليم";
}

function accentForSeverity(
  severity: OpsSeverity | undefined,
  fallback: "green" | "amber" | "red" | "blue",
): "green" | "amber" | "red" | "blue" {
  if (severity === "CRITICAL") return "red";
  if (severity === "WARN") return "amber";
  return fallback === "red" || fallback === "amber" ? "green" : fallback;
}

function SeverityBadge({ severity }: { severity: OpsSeverity }) {
  const styles =
    severity === "CRITICAL"
      ? "bg-red-500/10 text-red-600 ring-red-500/20"
      : severity === "WARN"
        ? "bg-amber-500/10 text-amber-600 ring-amber-500/20"
        : "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${styles}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {severityLabel(severity)}
    </span>
  );
}

function Tabs({
  active,
  onChange,
  snapshot,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  snapshot: OpsSnapshot | null;
}) {
  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    {
      key: "settlements",
      label: "التسويات",
      count: snapshot?.settlements.total ?? 0,
    },
    {
      key: "deadLetters",
      label: "DLQ",
      count: snapshot?.deadLetters.stats.DEAD ?? 0,
    },
    {
      key: "incidents",
      label: "المطابقة",
      count: snapshot?.incidents.total ?? 0,
    },
    {
      key: "risk",
      label: "المخاطر",
      count: snapshot?.riskReviews.length ?? 0,
    },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={
            active === tab.key
              ? "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white"
              : "rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-300"
          }
        >
          {tab.label}{" "}
          <span className="mr-1 opacity-75">({num(tab.count)})</span>
        </button>
      ))}
    </div>
  );
}

function ActionButton({
  children,
  busy,
  disabled,
  onClick,
}: {
  children: ReactNode;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300"
    >
      {busy ? <RefreshCcw size={14} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

function ReadOnly() {
  return <span className="text-xs text-slate-400">قراءة فقط</span>;
}
