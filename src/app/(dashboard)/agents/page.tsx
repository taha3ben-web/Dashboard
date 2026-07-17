"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Eye, KeyRound, PencilLine } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";

const PAGE_SIZE = 20;
const STATUSES = ["", "ACTIVE", "SUSPENDED", "INVITED"] as const;

import { AgentModals } from "./AgentModals";
import type {
  AgentEditorState,
  AgentRow,
  AgentStatus,
  AuditRow,
  CityOption,
  PasswordState,
  RoleOption,
  StatusState,
} from "./agents.types";

export default function AgentsPage() {
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [cityId, setCityId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    agentCode: "",
    roleId: "",
    cityId: "",
    notes: "",
  });
  const [editor, setEditor] = useState<AgentEditorState>({
    open: false,
    agent: null,
    name: "",
    phone: "",
    agentCode: "",
    cityId: "",
    notes: "",
  });
  const [passwordEditor, setPasswordEditor] = useState<PasswordState>({
    open: false,
    agent: null,
    password: "",
    confirmPassword: "",
  });
  const [statusEditor, setStatusEditor] = useState<StatusState>({
    open: false,
    agent: null,
    nextStatus: "ACTIVE",
    notes: "",
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentRow | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/agents", {
        params: {
          page,
          limit: PAGE_SIZE,
          status: status || undefined,
          cityId: cityId || undefined,
          search: search || undefined,
        },
      });
      setRows(response.data.items ?? []);
      setTotal(response.data.total ?? 0);
      setError("");
    } catch (loadError) {
      setRows([]);
      setTotal(0);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل الوكلاء"));
    } finally {
      setLoading(false);
    }
  }, [page, status, cityId, search]);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const response = await api.get("/agents/options");
      const nextRoles: RoleOption[] = response.data.roles ?? [];
      setRoles(nextRoles);
      setCities(response.data.cities ?? []);
      setForm((current) => ({
        ...current,
        roleId:
          current.roleId && nextRoles.some((role) => role.id === current.roleId)
            ? current.roleId
            : (nextRoles[0]?.id ?? ""),
      }));
      setError("");
    } catch (loadError) {
      setRoles([]);
      setCities([]);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل خيارات الوكلاء"));
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    setPage(1);
  }, [status, cityId, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const auditPages = Math.max(1, Math.ceil(auditTotal / 10));

  const clearFeedback = () => {
    setError("");
    setSuccess("");
  };

  async function createAgent() {
    clearFeedback();
    setBusyAction("create");
    try {
      await api.post("/agents", {
        ...form,
        cityId: form.cityId || undefined,
        notes: form.notes || undefined,
      });
      setForm({
        name: "",
        phone: "",
        password: "",
        agentCode: "",
        roleId: roles[0]?.id ?? "",
        cityId: "",
        notes: "",
      });
      setSuccess("تم إنشاء الوكيل بحالة مدعو. يجب تفعيله قبل تسجيل الدخول.");
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنشاء الوكيل"));
    } finally {
      setBusyAction("");
    }
  }

  async function assignRole(id: string, roleId: string) {
    clearFeedback();
    setBusyAction(`role:${id}`);
    try {
      await api.patch(`/agents/${id}/role`, { roleId });
      setSuccess("تم تغيير دور الوكيل.");
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تغيير دور الوكيل"));
    } finally {
      setBusyAction("");
    }
  }

  function openEditor(agent: AgentRow) {
    clearFeedback();
    setEditor({
      open: true,
      agent,
      name: agent.user.name,
      phone: agent.user.phone,
      agentCode: agent.agentCode,
      cityId: agent.city?.id ?? "",
      notes: agent.notes ?? "",
    });
  }

  async function updateAgent() {
    if (!editor.agent) return;
    clearFeedback();
    setBusyAction("update-agent");
    try {
      await api.patch(`/agents/${editor.agent.id}`, {
        name: editor.name,
        phone: editor.phone,
        agentCode: editor.agentCode,
        cityId: editor.cityId,
        notes: editor.notes,
      });
      setEditor({
        open: false,
        agent: null,
        name: "",
        phone: "",
        agentCode: "",
        cityId: "",
        notes: "",
      });
      setSuccess("تم تحديث بيانات الوكيل.");
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث بيانات الوكيل"));
    } finally {
      setBusyAction("");
    }
  }

  async function updateStatus() {
    if (!statusEditor.agent) return;
    clearFeedback();
    setBusyAction("update-status");
    try {
      await api.patch(`/agents/${statusEditor.agent.id}`, {
        status: statusEditor.nextStatus,
        notes: statusEditor.notes || undefined,
      });
      const label =
        statusEditor.nextStatus === "ACTIVE"
          ? "تفعيل"
          : statusEditor.nextStatus === "SUSPENDED"
            ? "تعليق"
            : "إعادة الوكيل إلى حالة مدعو";
      setStatusEditor({
        open: false,
        agent: null,
        nextStatus: "ACTIVE",
        notes: "",
      });
      setSuccess(`تم ${label}.`);
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث حالة الوكيل"));
    } finally {
      setBusyAction("");
    }
  }

  async function updatePassword() {
    if (!passwordEditor.agent) return;
    if (passwordEditor.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }
    if (passwordEditor.password !== passwordEditor.confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }
    clearFeedback();
    setBusyAction("update-password");
    try {
      await api.patch(`/agents/${passwordEditor.agent.id}/password`, {
        password: passwordEditor.password,
      });
      setPasswordEditor({
        open: false,
        agent: null,
        password: "",
        confirmPassword: "",
      });
      setSuccess("تم تحديث كلمة المرور وإنهاء جلسات الوكيل المفتوحة.");
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث كلمة مرور الوكيل"));
    } finally {
      setBusyAction("");
    }
  }

  const loadDetails = useCallback(
    async (agentId: string, nextAuditPage = 1) => {
      setDetailsLoading(true);
      try {
        const [agentResponse, auditResponse] = await Promise.all([
          api.get(`/agents/${agentId}`),
          api.get(`/agents/${agentId}/audit`, {
            params: { page: nextAuditPage, limit: 10 },
          }),
        ]);
        setSelectedAgent(agentResponse.data);
        setAuditRows(auditResponse.data.items ?? []);
        setAuditTotal(auditResponse.data.total ?? 0);
        setAuditPage(nextAuditPage);
        setError("");
      } catch (actionError) {
        setError(getApiErrorMessage(actionError, "تعذّر تحميل تفاصيل الوكيل"));
      } finally {
        setDetailsLoading(false);
      }
    },
    [],
  );

  async function openDetails(agent: AgentRow) {
    setDetailsOpen(true);
    setSelectedAgent(agent);
    setAuditRows([]);
    setAuditTotal(0);
    await loadDetails(agent.id, 1);
  }

  const columns: Column<AgentRow>[] = useMemo(
    () => [
      {
        key: "agent",
        header: "الوكيل",
        render: (row) => (
          <div>
            <div className="font-medium">{row.user.name}</div>
            <div className="text-xs text-gray-500">{row.user.phone}</div>
          </div>
        ),
      },
      {
        key: "agentCode",
        header: "الرمز",
        render: (row) => <span className="font-mono">{row.agentCode}</span>,
      },
      {
        key: "city",
        header: "المدينة",
        render: (row) => row.city?.name ?? "-",
      },
      {
        key: "role",
        header: "الدور",
        render: (row) => (
          <select
            value={row.user.staffRole?.id ?? ""}
            onChange={(event) => void assignRole(row.id, event.target.value)}
            disabled={busyAction === `role:${row.id}` || roles.length === 0}
            className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">بدون دور</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "status",
        header: "الحالة",
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "lastLoginAt",
        header: "آخر دخول",
        render: (row) => dateTime(row.lastLoginAt),
      },
      {
        key: "actions",
        header: "الإجراءات",
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => void openDetails(row)}
              className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-1 text-xs text-indigo-600"
            >
              <Eye size={13} /> تفاصيل
            </button>
            <button
              onClick={() => openEditor(row)}
              className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600"
            >
              <PencilLine size={13} /> تعديل
            </button>
            <button
              onClick={() =>
                setPasswordEditor({
                  open: true,
                  agent: row,
                  password: "",
                  confirmPassword: "",
                })
              }
              className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-1 text-xs text-purple-600"
            >
              <KeyRound size={13} /> كلمة المرور
            </button>
            {STATUSES.filter((value) => value && value !== row.status).map(
              (nextStatus) => (
                <button
                  key={nextStatus}
                  onClick={() =>
                    setStatusEditor({
                      open: true,
                      agent: row,
                      nextStatus: nextStatus as AgentStatus,
                      notes: row.notes ?? "",
                    })
                  }
                  className="rounded bg-gray-500/10 px-2 py-1 text-xs text-gray-600 dark:text-gray-300"
                >
                  {nextStatus === "ACTIVE"
                    ? "تفعيل"
                    : nextStatus === "SUSPENDED"
                      ? "تعليق"
                      : "دعوة"}
                </button>
              ),
            )}
          </div>
        ),
      },
    ],
    [busyAction, roles],
  );

  const auditColumns: Column<AuditRow>[] = [
    { key: "action", header: "الإجراء", render: (row) => row.action },
    { key: "actor", header: "المنفذ", render: (row) => row.actor?.name ?? "-" },
    { key: "ip", header: "IP", render: (row) => row.ip ?? "-" },
    {
      key: "createdAt",
      header: "الوقت",
      render: (row) => dateTime(row.createdAt),
    },
  ];

  return (
    <>
      <Topbar title="إدارة الوكلاء" />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-900/40 dark:bg-purple-950/20">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <Bot size={18} />
            <span className="font-medium">
              إدارة حسابات الوكلاء وأدوارهم ومد��هم من الخادم
            </span>
          </div>
          <div className="mt-1 text-sm text-purple-700/80 dark:text-purple-300/80">
            الإجمالي المطابق للفلاتر: {num(total)}
          </div>
        </div>

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

        <section className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-4">
          <div className="md:col-span-4 font-semibold">إنشاء وكيل جديد</div>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="اسم الوكيل"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
            placeholder="الهاتف"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            value={form.agentCode}
            onChange={(event) =>
              setForm({ ...form, agentCode: event.target.value.toUpperCase() })
            }
            placeholder="رمز الوكيل"
            className="rounded-lg border border-gray-300 px-3 py-2 font-mono dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            placeholder="كلمة المرور (6 أحرف على الأقل)"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <select
            value={form.roleId}
            onChange={(event) =>
              setForm({ ...form, roleId: event.target.value })
            }
            disabled={optionsLoading || roles.length === 0}
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            {roles.length === 0 ? (
              <option value="">لا توجد أدوار متاحة</option>
            ) : null}
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            value={form.cityId}
            onChange={(event) =>
              setForm({ ...form, cityId: event.target.value })
            }
            disabled={optionsLoading}
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">بدون مدينة</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <input
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
            placeholder="ملاحظات"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            onClick={() => void createAgent()}
            disabled={
              busyAction === "create" ||
              !form.name ||
              !form.phone ||
              form.password.length < 6 ||
              !form.agentCode ||
              !form.roleId
            }
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busyAction === "create" ? "جارٍ الإنشاء..." : "إنشاء وكيل"}
          </button>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            >
              {STATUSES.map((value) => (
                <option key={value || "all"} value={value}>
                  {value || "كل الحالات"}
                </option>
              ))}
            </select>
            <select
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">كل المدن</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو الرمز"
              className="min-w-72 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <button
              onClick={() => void Promise.all([load(), loadOptions()])}
              disabled={loading || optionsLoading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              تحديث
            </button>
          </div>

          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            empty="لا توجد حسابات وكلاء"
          />
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              الصفحة {num(page)} من {num(totalPages)} · الإجمالي {num(total)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
              >
                السابق
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
              >
                التالي
              </button>
            </div>
          </div>
        </section>
      </div>

      <AgentModals
        cities={cities}
        editor={editor}
        setEditor={setEditor}
        passwordEditor={passwordEditor}
        setPasswordEditor={setPasswordEditor}
        statusEditor={statusEditor}
        setStatusEditor={setStatusEditor}
        busyAction={busyAction}
        updateAgent={updateAgent}
        updatePassword={updatePassword}
        updateStatus={updateStatus}
        detailsOpen={detailsOpen}
        closeDetails={() => {
          setDetailsOpen(false);
          setSelectedAgent(null);
          setAuditRows([]);
        }}
        selectedAgent={selectedAgent}
        auditRows={auditRows}
        auditColumns={auditColumns}
        detailsLoading={detailsLoading}
        auditPage={auditPage}
        auditPages={auditPages}
        auditTotal={auditTotal}
        loadDetails={loadDetails}
      />
    </>
  );
}
