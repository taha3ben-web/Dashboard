"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

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

export default function SecurityCenterPage() {
  const { can } = useAuth();
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionUserId, setSessionUserId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canInspectOtherSessions = can("audit.read", "staff.manage");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/logs/audit", { params: { page: 1, limit: 20 } }),
      api.get("/logs/activity", { params: { page: 1, limit: 20 } }),
      api.get("/sessions/me"),
    ])
      .then(([auditResponse, activityResponse, sessionsResponse]) => {
        setAuditRows(auditResponse.data.items ?? []);
        setActivityRows(activityResponse.data.items ?? []);
        setSessions(sessionsResponse.data ?? []);
      })
      .catch((loadError) => {
        setAuditRows([]);
        setActivityRows([]);
        setSessions([]);
        setError(getApiErrorMessage(loadError, "تعذّر تحميل مركز الأمان"));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadUserSessions() {
    if (!canInspectOtherSessions) return;
    if (!sessionUserId.trim()) {
      load();
      return;
    }
    try {
      const response = await api.get(`/sessions/user/${sessionUserId.trim()}`);
      setSessions(response.data ?? []);
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحميل جلسات المستخدم"));
    }
  }

  async function revokeMySession(id: string) {
    try {
      await api.delete(`/sessions/${id}`);
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنهاء الجلسة"));
    }
  }

  async function revokeAllMine() {
    try {
      await api.delete("/sessions");
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنهاء كل الجلسات"));
    }
  }

  const auditColumns: Column<AuditRow>[] = [
    { key: "action", header: "الإجراء", render: (row) => <div><div className="font-medium">{row.action}</div><div className="text-xs text-gray-500">{row.entity ?? "-"}</div></div> },
    { key: "actor", header: "المنفذ", render: (row) => row.actor?.name ?? "-" },
    { key: "entityId", header: "المعرف", render: (row) => row.entityId ?? "-" },
    { key: "ip", header: "IP", render: (row) => row.ip ?? "-" },
    { key: "createdAt", header: "الوقت", render: (row) => dateTime(row.createdAt) },
  ];

  const activityColumns: Column<ActivityRow>[] = [
    { key: "action", header: "النشاط", render: (row) => row.action },
    { key: "user", header: "المستخدم", render: (row) => row.user?.name ?? "-" },
    { key: "ip", header: "IP", render: (row) => row.ip ?? "-" },
    { key: "createdAt", header: "الوقت", render: (row) => dateTime(row.createdAt) },
  ];

  const sessionColumns: Column<SessionRow>[] = [
    { key: "ip", header: "IP", render: (row) => row.ip ?? "-" },
    { key: "userAgent", header: "الجهاز", render: (row) => row.userAgent ?? "-" },
    { key: "createdAt", header: "بدأت", render: (row) => dateTime(row.createdAt) },
    { key: "lastSeenAt", header: "آخر ظهور", render: (row) => dateTime(row.lastSeenAt) },
    {
      key: "actions",
      header: "إجراء",
      render: (row) => (
        <button onClick={() => void revokeMySession(row.id)} className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600">
          إنهاء
        </button>
      ),
    },
  ];

  return (
    <>
      <Topbar title="مركز الأمان والسجلات" />
      <div className="space-y-6 p-6">
        {!canInspectOtherSessions ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            يمكنك مراجعة سجلاتك والجلسات الحالية فقط. عرض جلسات مستخدمين آخرين يظهر فقط عند توفر صلاحيات التدقيق أو إدارة الطاقم.
          </div>
        ) : null}

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <ShieldAlert size={18} />
            <span className="font-medium">مراقبة التدقيق والنشاط والجلسات من مكان واحد</span>
          </div>
          <div className="mt-1 text-sm text-red-700/80 dark:text-red-300/80">
            تدقيق: {num(auditRows.length)} · نشاط: {num(activityRows.length)} · جلسات معروضة: {num(sessions.length)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <button onClick={() => void load()} disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">تحديث</button>
          <button onClick={() => void revokeAllMine()} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 dark:border-red-800">إنهاء كل جلساتي</button>
          {canInspectOtherSessions ? (
            <>
              <input value={sessionUserId} onChange={(event) => setSessionUserId(event.target.value)} placeholder="معرّف مستخدم لعرض جلساته" className="min-w-72 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
              <button onClick={() => void loadUserSessions()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">عرض الجلسات</button>
            </>
          ) : null}
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <section>
          <h2 className="mb-3 font-bold">سجل التدقيق</h2>
          <DataTable columns={auditColumns} rows={auditRows} empty="لا توجد سجلات تدقيق" />
        </section>

        <section>
          <h2 className="mb-3 font-bold">سجل النشاط</h2>
          <DataTable columns={activityColumns} rows={activityRows} empty="لا توجد سجلات نشاط" />
        </section>

        <section>
          <h2 className="mb-3 font-bold">الجلسات</h2>
          <DataTable columns={sessionColumns} rows={sessions} empty="لا توجد جلسات" />
        </section>
      </div>
    </>
  );
}
