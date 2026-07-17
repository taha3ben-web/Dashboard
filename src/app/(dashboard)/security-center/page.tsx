"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

const PAGE_SIZE = 20;
const SESSION_PAGE_SIZE = 10;

interface AuditRow {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: { name?: string; type?: string } | null;
}

interface ActivityRow {
  id: string;
  action: string;
  ip?: string | null;
  createdAt: string;
  user?: { name?: string; type?: string } | null;
}

interface SessionRow {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
  lastSeenAt: string;
}

interface SessionRevokeDialogState {
  open: boolean;
  session: SessionRow | null;
}

interface SessionBulkDialogState {
  open: boolean;
  target: "mine" | "other";
}

interface ReadinessResponse {
  ok: boolean;
  ts: string;
  checks: {
    db: { ok: boolean; latencyMs?: number; error?: string };
    redis: { ok: boolean; latencyMs?: number; error?: string };
  };
  counters: {
    sessionCount: number;
    pendingSettingApprovals: number;
    activeFeatureFlags: number;
    publishedVehicleTypes: number;
    recentAuditEvents: number;
    recentActivityEvents: number;
  };
  featureFlags: {
    globalKillSwitch: boolean;
    globalKillReason?: string | null;
  };
  config: {
    value?: unknown;
    publishedValue?: unknown;
    updatedAt?: string | null;
  };
  alerts: string[];
}

export default function SecurityCenterPage() {
  const { can, profile } = useAuth();
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [sessionRows, setSessionRows] = useState<SessionRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [activityTotal, setActivityTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [auditEntity, setAuditEntity] = useState("");
  const [auditActorIdInput, setAuditActorIdInput] = useState("");
  const [auditActorId, setAuditActorId] = useState("");
  const [activityUserIdInput, setActivityUserIdInput] = useState("");
  const [activityUserId, setActivityUserId] = useState("");
  const [sessionUserIdInput, setSessionUserIdInput] = useState("");
  const [viewedSessionUserId, setViewedSessionUserId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [revokeDialog, setRevokeDialog] = useState<SessionRevokeDialogState>({
    open: false,
    session: null,
  });
  const [revokeAllDialog, setRevokeAllDialog] =
    useState<SessionBulkDialogState>({
      open: false,
      target: "mine",
    });

  const canInspectOtherSessions = can("audit.read", "staff.manage");
  const activeSessionTargetUserId = useMemo(() => {
    const trimmed = viewedSessionUserId.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [viewedSessionUserId]);
  const isViewingOtherUserSessions =
    Boolean(activeSessionTargetUserId) &&
    activeSessionTargetUserId !== profile?.userId;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAuditActorId(auditActorIdInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [auditActorIdInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActivityUserId(activityUserIdInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activityUserIdInput]);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const response = await api.get("/logs/audit", {
        params: {
          page: auditPage,
          limit: PAGE_SIZE,
          entity: auditEntity || undefined,
          actorId: auditActorId || undefined,
        },
      });
      setAuditRows(response.data.items ?? []);
      setAuditTotal(response.data.total ?? 0);
      setError("");
    } catch (loadError) {
      setAuditRows([]);
      setAuditTotal(0);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل سجل التدقيق"));
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditEntity, auditActorId]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const response = await api.get("/logs/activity", {
        params: {
          page: activityPage,
          limit: PAGE_SIZE,
          userId: activityUserId || undefined,
        },
      });
      setActivityRows(response.data.items ?? []);
      setActivityTotal(response.data.total ?? 0);
      setError("");
    } catch (loadError) {
      setActivityRows([]);
      setActivityTotal(0);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل سجل النشاط"));
    } finally {
      setActivityLoading(false);
    }
  }, [activityPage, activityUserId]);

  const loadSessions = useCallback(async () => {
    setSessionLoading(true);
    try {
      const response = activeSessionTargetUserId
        ? await api.get(`/sessions/user/${activeSessionTargetUserId}`)
        : await api.get("/sessions/me");
      setSessionRows(response.data ?? []);
      setError("");
    } catch (loadError) {
      setSessionRows([]);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل الجلسات"));
    } finally {
      setSessionLoading(false);
    }
  }, [activeSessionTargetUserId]);

  const loadReadiness = useCallback(async () => {
    setReadinessLoading(true);
    try {
      const response = await api.get("/dashboard/readiness");
      setReadiness(response.data ?? null);
      setError("");
    } catch (loadError) {
      setReadiness(null);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل حالة الجاهزية"));
    } finally {
      setReadinessLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  const visibleSessions = useMemo(() => {
    const start = (sessionPage - 1) * SESSION_PAGE_SIZE;
    return sessionRows.slice(start, start + SESSION_PAGE_SIZE);
  }, [sessionPage, sessionRows]);

  const totalSessionPages = Math.max(
    1,
    Math.ceil(sessionRows.length / SESSION_PAGE_SIZE),
  );
  const totalAuditPages = Math.max(1, Math.ceil(auditTotal / PAGE_SIZE));
  const totalActivityPages = Math.max(1, Math.ceil(activityTotal / PAGE_SIZE));

  useEffect(() => {
    setAuditPage(1);
  }, [auditEntity, auditActorId]);

  useEffect(() => {
    setActivityPage(1);
  }, [activityUserId]);

  useEffect(() => {
    setSessionPage(1);
  }, [sessionRows.length, viewedSessionUserId]);

  const clearFeedback = () => {
    setError("");
    setSuccess("");
  };

  async function refreshAll() {
    clearFeedback();
    await Promise.all([
      loadAudit(),
      loadActivity(),
      loadSessions(),
      loadReadiness(),
    ]);
    setSuccess("تم تحديث السجلات والجلسات.");
  }

  async function applySessionTarget() {
    if (!canInspectOtherSessions) return;
    clearFeedback();
    setViewedSessionUserId(sessionUserIdInput.trim());
  }

  async function showMySessions() {
    clearFeedback();
    setSessionUserIdInput("");
    setViewedSessionUserId("");
  }

  async function revokeSession() {
    if (!revokeDialog.session) return;
    clearFeedback();
    setBusyAction(`revoke:${revokeDialog.session.id}`);
    try {
      if (isViewingOtherUserSessions && activeSessionTargetUserId) {
        await api.delete(
          `/sessions/user/${activeSessionTargetUserId}/${revokeDialog.session.id}`,
        );
        setSuccess("تم إنهاء جلسة المستخدم المحدد.");
      } else {
        await api.delete(`/sessions/${revokeDialog.session.id}`);
        setSuccess("تم إنهاء الجلسة المحددة.");
      }
      setRevokeDialog({ open: false, session: null });
      await Promise.all([loadSessions(), loadActivity(), loadAudit()]);
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنهاء الجلسة"));
    } finally {
      setBusyAction("");
    }
  }

  async function revokeAllSessions() {
    clearFeedback();
    setBusyAction(`revoke-all:${revokeAllDialog.target}`);
    try {
      if (revokeAllDialog.target === "other" && activeSessionTargetUserId) {
        await api.delete(`/sessions/user/${activeSessionTargetUserId}`);
        setSuccess("تم إنهاء كل جلسات المستخدم المحدد.");
      } else {
        await api.delete("/sessions");
        setSuccess("تم إنهاء كل جلساتك.");
      }
      setRevokeAllDialog({ open: false, target: "mine" });
      await Promise.all([loadSessions(), loadActivity(), loadAudit()]);
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنهاء الجلسات"));
    } finally {
      setBusyAction("");
    }
  }

  const auditColumns: Column<AuditRow>[] = [
    {
      key: "action",
      header: "الإجراء",
      render: (row) => (
        <div>
          <div className="font-medium">{row.action}</div>
          <div className="text-xs text-gray-500">{row.entity ?? "-"}</div>
        </div>
      ),
    },
    { key: "actor", header: "المنفذ", render: (row) => row.actor?.name ?? "-" },
    { key: "entityId", header: "المعرف", render: (row) => row.entityId ?? "-" },
    { key: "ip", header: "IP", render: (row) => row.ip ?? "-" },
    {
      key: "createdAt",
      header: "الوقت",
      render: (row) => dateTime(row.createdAt),
    },
  ];

  const activityColumns: Column<ActivityRow>[] = [
    { key: "action", header: "النشاط", render: (row) => row.action },
    { key: "user", header: "المستخدم", render: (row) => row.user?.name ?? "-" },
    { key: "ip", header: "IP", render: (row) => row.ip ?? "-" },
    {
      key: "createdAt",
      header: "الوقت",
      render: (row) => dateTime(row.createdAt),
    },
  ];

  const sessionColumns: Column<SessionRow>[] = [
    { key: "ip", header: "IP", render: (row) => row.ip ?? "-" },
    {
      key: "userAgent",
      header: "الجهاز",
      render: (row) => row.userAgent ?? "-",
    },
    {
      key: "createdAt",
      header: "بدأت",
      render: (row) => dateTime(row.createdAt),
    },
    {
      key: "lastSeenAt",
      header: "آخر ظهور",
      render: (row) => dateTime(row.lastSeenAt),
    },
    {
      key: "actions",
      header: "إجراء",
      render: (row) => (
        <button
          onClick={() => setRevokeDialog({ open: true, session: row })}
          className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600"
        >
          إنهاء
        </button>
      ),
    },
  ];

  return (
    <>
      <Topbar title="مركز الأمان والسجلات" />
      <div className="space-y-6 p-4 sm:p-6">
        {!canInspectOtherSessions ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            يمكنك مراجعة سجلاتك والجلسات الحالية فقط. إدارة جلسات مستخدمين آخرين
            تحتاج صلاحية تدقيق أو إدارة الطاقم.
          </div>
        ) : null}

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <ShieldAlert size={18} />
            <span className="font-medium">
              مراقبة التدقيق والنشاط والجلسات من مكان واحد
            </span>
          </div>
          <div className="mt-1 text-sm text-red-700/80 dark:text-red-300/80">
            تدقيق: {num(auditTotal)} · نشاط: {num(activityTotal)} · جلسات
            معروضة: {num(sessionRows.length)}
          </div>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">الجاهزية الإنتاجية</h2>
              <div className="text-sm text-gray-500">
                آخر تحديث: {dateTime(readiness?.ts)}
              </div>
            </div>
            <span
              className={
                readiness?.ok
                  ? "rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600"
                  : "rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-600"
              }
            >
              {readinessLoading
                ? "جارٍ الفحص..."
                : readiness?.ok
                  ? "جاهز"
                  : "بحاجة مراجعة"}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <div className="text-xs text-gray-500">DB / Redis</div>
              <div className="mt-1 text-sm font-medium">
                {readiness?.checks.db.ok ? "DB OK" : "DB FAIL"} ·{" "}
                {readiness?.checks.redis.ok ? "Redis OK" : "Redis FAIL"}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <div className="text-xs text-gray-500">الجلسات النشطة</div>
              <div className="mt-1 text-sm font-medium">
                {num(readiness?.counters.sessionCount)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <div className="text-xs text-gray-500">
                طلبات الإعدادات المعلقة
              </div>
              <div className="mt-1 text-sm font-medium">
                {num(readiness?.counters.pendingSettingApprovals)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <div className="text-xs text-gray-500">Feature Flags المفعلة</div>
              <div className="mt-1 text-sm font-medium">
                {num(readiness?.counters.activeFeatureFlags)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <div className="text-xs text-gray-500">أنواع مركبات منشورة</div>
              <div className="mt-1 text-sm font-medium">
                {num(readiness?.counters.publishedVehicleTypes)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <div className="text-xs text-gray-500">Kill Switch عام</div>
              <div className="mt-1 text-sm font-medium">
                {readiness?.featureFlags.globalKillSwitch ? "مفعل" : "متوقف"}
              </div>
            </div>
          </div>
          {readiness?.alerts?.length ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              {readiness.alerts.join(" • ")}
            </div>
          ) : null}
        </section>

        {success ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <button
            onClick={() => void refreshAll()}
            disabled={auditLoading || activityLoading || sessionLoading}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            تحديث الكل
          </button>
          <button
            onClick={() => setRevokeAllDialog({ open: true, target: "mine" })}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 dark:border-red-800"
          >
            إنهاء كل جلساتي
          </button>
          {canInspectOtherSessions ? (
            <>
              <input
                value={sessionUserIdInput}
                onChange={(event) => setSessionUserIdInput(event.target.value)}
                placeholder="معرّف مستخدم لعرض جلساته"
                className="min-w-72 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                onClick={() => void applySessionTarget()}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
              >
                عرض الجلسات
              </button>
              <button
                onClick={() => void showMySessions()}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
              >
                جلساتي أنا
              </button>
              {isViewingOtherUserSessions ? (
                <button
                  onClick={() =>
                    setRevokeAllDialog({ open: true, target: "other" })
                  }
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 dark:border-red-800"
                >
                  إنهاء كل جلسات هذا المستخدم
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">سجل التدقيق</h2>
              <div className="text-sm text-gray-500">
                فلترة حسب الكيان أو المنفذ مع Pagination.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={auditEntity}
                onChange={(event) => setAuditEntity(event.target.value)}
                placeholder="فلتر الكيان مثل staff أو rbac"
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
              <input
                value={auditActorIdInput}
                onChange={(event) => setAuditActorIdInput(event.target.value)}
                placeholder="فلتر actorId"
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>
          <DataTable
            columns={auditColumns}
            rows={auditRows}
            loading={auditLoading}
            empty="لا توجد سجلات تدقيق"
          />
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
            <span>
              الصفحة {num(auditPage)} من {num(totalAuditPages)} · الإجمالي{" "}
              {num(auditTotal)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={auditPage <= 1 || auditLoading}
                onClick={() => setAuditPage((value) => value - 1)}
              >
                السابق
              </button>
              <button
                disabled={auditPage >= totalAuditPages || auditLoading}
                onClick={() => setAuditPage((value) => value + 1)}
              >
                التالي
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">سجل النشاط</h2>
              <div className="text-sm text-gray-500">
                يعرض عمليات المصادقة والجلسات وسلوك المستخدمين.
              </div>
            </div>
            <input
              value={activityUserIdInput}
              onChange={(event) => setActivityUserIdInput(event.target.value)}
              placeholder="فلتر userId"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <DataTable
            columns={activityColumns}
            rows={activityRows}
            loading={activityLoading}
            empty="لا توجد سجلات نشاط"
          />
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
            <span>
              الصفحة {num(activityPage)} من {num(totalActivityPages)} · الإجمالي{" "}
              {num(activityTotal)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={activityPage <= 1 || activityLoading}
                onClick={() => setActivityPage((value) => value - 1)}
              >
                السابق
              </button>
              <button
                disabled={activityPage >= totalActivityPages || activityLoading}
                onClick={() => setActivityPage((value) => value + 1)}
              >
                التالي
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">الجلسات</h2>
              <div className="text-sm text-gray-500">
                {isViewingOtherUserSessions
                  ? `تراجع الآن جلسات المستخدم: ${activeSessionTargetUserId}`
                  : "تعرض جلساتك الحالية النشطة."}
              </div>
            </div>
          </div>
          <DataTable
            columns={sessionColumns}
            rows={visibleSessions}
            loading={sessionLoading}
            empty="لا توجد جلسات"
          />
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
            <span>
              الصفحة {num(sessionPage)} من {num(totalSessionPages)} · الإجمالي{" "}
              {num(sessionRows.length)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={sessionPage <= 1 || sessionLoading}
                onClick={() => setSessionPage((value) => value - 1)}
              >
                السابق
              </button>
              <button
                disabled={sessionPage >= totalSessionPages || sessionLoading}
                onClick={() => setSessionPage((value) => value + 1)}
              >
                التالي
              </button>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={revokeDialog.open}
        title="إنهاء الجلسة"
        message={
          revokeDialog.session
            ? `سيتم إنهاء الجلسة التي بدأت في ${dateTime(revokeDialog.session.createdAt)} وإبطال توكنات التحديث المرتبطة بها.`
            : "سيتم إنهاء الجلسة المحددة."
        }
        tone="danger"
        confirmLabel="إنهاء الجلسة"
        onCancel={() => setRevokeDialog({ open: false, session: null })}
        onConfirm={revokeSession}
      />

      <ConfirmDialog
        open={revokeAllDialog.open}
        title={
          revokeAllDialog.target === "other"
            ? "إنهاء كل جلسات المستخدم"
            : "إنهاء كل جلساتك"
        }
        message={
          revokeAllDialog.target === "other" && activeSessionTargetUserId
            ? `سيتم إنهاء جميع جلسات المستخدم ${activeSessionTargetUserId} وإبطال توكنات التحديث المرتبطة بها.`
            : "سيتم إنهاء جميع جلساتك الحالية وإبطال توكنات التحديث المرتبطة بها."
        }
        tone="danger"
        confirmLabel={
          busyAction.startsWith("revoke-all") ? "جارٍ..." : "تأكيد الإنهاء"
        }
        onCancel={() => setRevokeAllDialog({ open: false, target: "mine" })}
        onConfirm={revokeAllSessions}
      />
    </>
  );
}
