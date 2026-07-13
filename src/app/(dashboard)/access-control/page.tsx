"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  PencilLine,
  ShieldCheck,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

const STAFF_PAGE_SIZE = 20;

interface PermissionItem {
  id: string;
  key: string;
  description?: string | null;
}

interface RoleItem {
  id: string;
  name: string;
  description?: string | null;
  permissions: Array<{ permission: PermissionItem }>;
  _count?: { users?: number };
}

interface StaffItem {
  id: string;
  name: string;
  phone: string;
  status: string;
  createdAt: string;
  staffRole?: { id: string; name: string } | null;
}

interface AuditRow {
  id: string;
  action: string;
  entity?: string | null;
  createdAt: string;
  actor?: { name?: string; type?: string } | null;
}

interface RoleEditorState {
  open: boolean;
  roleId: string | null;
  name: string;
  description: string;
}

interface PasswordEditorState {
  open: boolean;
  staffId: string | null;
  staffName: string;
  password: string;
  confirmPassword: string;
}

interface StatusDialogState {
  open: boolean;
  staffId: string | null;
  staffName: string;
  nextStatus: "ACTIVE" | "SUSPENDED" | "BANNED";
}

interface DeleteRoleState {
  open: boolean;
  role: RoleItem | null;
}

export default function AccessControlPage() {
  const { profile, can, refreshProfile } = useAuth();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditRow[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [rolePermissionKeys, setRolePermissionKeys] = useState<string[]>([]);
  const [staffSearchInput, setStaffSearchInput] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [staffPage, setStaffPage] = useState(1);
  const [staffTotal, setStaffTotal] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [staffForm, setStaffForm] = useState({
    name: "",
    phone: "",
    password: "",
    roleId: "",
  });
  const [roleEditor, setRoleEditor] = useState<RoleEditorState>({
    open: false,
    roleId: null,
    name: "",
    description: "",
  });
  const [passwordEditor, setPasswordEditor] = useState<PasswordEditorState>({
    open: false,
    staffId: null,
    staffName: "",
    password: "",
    confirmPassword: "",
  });
  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    open: false,
    staffId: null,
    staffName: "",
    nextStatus: "SUSPENDED",
  });
  const [deleteRoleDialog, setDeleteRoleDialog] = useState<DeleteRoleState>({
    open: false,
    role: null,
  });
  const canReviewAudit = can("audit.read", "staff.manage");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStaffSearch(staffSearchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [staffSearchInput]);

  const loadReferenceData = useCallback(async () => {
    setReferenceLoading(true);
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        api.get("/rbac/roles"),
        api.get("/rbac/permissions"),
      ]);
      const nextRoles: RoleItem[] = rolesResponse.data ?? [];
      const nextPermissions: PermissionItem[] = permissionsResponse.data ?? [];
      setRoles(nextRoles);
      setPermissions(nextPermissions);
      setSelectedRoleId((current) => {
        const exists = nextRoles.some((role) => role.id === current);
        return exists ? current : (nextRoles[0]?.id ?? "");
      });
      setStaffForm((current) => {
        const roleExists = nextRoles.some((role) => role.id === current.roleId);
        return {
          ...current,
          roleId: roleExists ? current.roleId : (nextRoles[0]?.id ?? ""),
        };
      });
      setError("");
    } catch (loadError) {
      setRoles([]);
      setPermissions([]);
      setSelectedRoleId("");
      setError(getApiErrorMessage(loadError, "تعذّر تحميل الأدوار والصلاحيات"));
    } finally {
      setReferenceLoading(false);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const response = await api.get("/staff", {
        params: {
          page: staffPage,
          limit: STAFF_PAGE_SIZE,
          search: staffSearch || undefined,
        },
      });
      setStaff(response.data.items ?? []);
      setStaffTotal(response.data.total ?? 0);
      setError("");
    } catch (loadError) {
      setStaff([]);
      setStaffTotal(0);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل حسابات الموظفين"));
    } finally {
      setStaffLoading(false);
    }
  }, [staffPage, staffSearch]);

  const loadAuditPreview = useCallback(async () => {
    if (!canReviewAudit) return;
    setAuditLoading(true);
    try {
      const [staffAuditResponse, rbacAuditResponse] = await Promise.all([
        api.get("/logs/audit", {
          params: { page: 1, limit: 8, entity: "staff" },
        }),
        api.get("/logs/audit", {
          params: { page: 1, limit: 8, entity: "rbac" },
        }),
      ]);
      const rows: AuditRow[] = [
        ...(staffAuditResponse.data.items ?? []),
        ...(rbacAuditResponse.data.items ?? []),
      ]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 8);
      setRecentAudit(rows);
    } catch {
      setRecentAudit([]);
    } finally {
      setAuditLoading(false);
    }
  }, [canReviewAudit]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    void loadAuditPreview();
  }, [loadAuditPreview]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  useEffect(() => {
    setRolePermissionKeys(
      selectedRole?.permissions.map((item) => item.permission.key) ?? [],
    );
  }, [selectedRole]);

  const clearFeedback = () => {
    setError("");
    setSuccess("");
  };

  const refreshAfterStaffChange = async (
    message: string,
    affectedStaffId?: string,
  ) => {
    setSuccess(message);
    await Promise.all([loadStaff(), loadAuditPreview()]);
    if (affectedStaffId && affectedStaffId === profile?.user.id) {
      await refreshProfile().catch(() => null);
    }
  };

  const refreshAfterRoleChange = async (
    message: string,
    affectedRoleId?: string,
  ) => {
    setSuccess(message);
    await Promise.all([loadReferenceData(), loadAuditPreview()]);
    if (affectedRoleId && profile?.staffRole?.id === affectedRoleId) {
      await refreshProfile().catch(() => null);
    }
  };

  function togglePermission(key: string) {
    setRolePermissionKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function openCreateRoleDialog() {
    clearFeedback();
    setRoleEditor({ open: true, roleId: null, name: "", description: "" });
  }

  function openEditRoleDialog(role: RoleItem) {
    clearFeedback();
    setRoleEditor({
      open: true,
      roleId: role.id,
      name: role.name,
      description: role.description ?? "",
    });
  }

  async function submitRoleEditor() {
    clearFeedback();
    setBusyAction(roleEditor.roleId ? "update-role" : "create-role");
    try {
      if (roleEditor.roleId) {
        await api.patch(`/rbac/roles/${roleEditor.roleId}`, {
          description: roleEditor.description || undefined,
        });
        await refreshAfterRoleChange("تم تحديث وصف الدور.", roleEditor.roleId);
      } else {
        const response = await api.post("/rbac/roles", {
          name: roleEditor.name,
          description: roleEditor.description || undefined,
          permissionKeys: [],
        });
        await refreshAfterRoleChange(
          "تم إنشاء الدور الجديد.",
          response.data.id,
        );
        setSelectedRoleId(response.data.id);
      }
      setRoleEditor({ open: false, roleId: null, name: "", description: "" });
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر حفظ الدور"));
    } finally {
      setBusyAction("");
    }
  }

  async function saveRolePermissions() {
    if (!selectedRoleId) return;
    clearFeedback();
    setBusyAction("save-role-permissions");
    try {
      await api.put(`/rbac/roles/${selectedRoleId}/permissions`, {
        permissionKeys: rolePermissionKeys,
      });
      await refreshAfterRoleChange("تم حفظ صلاحيات الدور.", selectedRoleId);
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر حفظ صلاحيات الدور"));
    } finally {
      setBusyAction("");
    }
  }

  async function deleteRole() {
    if (!deleteRoleDialog.role) return;
    clearFeedback();
    setBusyAction("delete-role");
    try {
      await api.delete(`/rbac/roles/${deleteRoleDialog.role.id}`);
      setDeleteRoleDialog({ open: false, role: null });
      await refreshAfterRoleChange("تم حذف الدور.", deleteRoleDialog.role.id);
    } finally {
      setBusyAction("");
    }
  }

  async function createStaff() {
    clearFeedback();
    setBusyAction("create-staff");
    try {
      await api.post("/staff", staffForm);
      setStaffForm({
        name: "",
        phone: "",
        password: "",
        roleId: roles[0]?.id ?? "",
      });
      await refreshAfterStaffChange("تم إنشاء حساب الموظف.");
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنشاء حساب الموظف"));
    } finally {
      setBusyAction("");
    }
  }

  async function assignRole(staffId: string, roleId: string) {
    clearFeedback();
    setBusyAction(`assign-role:${staffId}`);
    try {
      await api.patch(`/staff/${staffId}/role`, { roleId });
      await refreshAfterStaffChange("تم تحديث دور الموظف.", staffId);
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تغيير الدور"));
    } finally {
      setBusyAction("");
    }
  }

  async function submitPasswordReset() {
    if (!passwordEditor.staffId) return;
    if (passwordEditor.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }
    if (passwordEditor.password !== passwordEditor.confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }
    clearFeedback();
    setBusyAction("reset-password");
    try {
      await api.patch(`/staff/${passwordEditor.staffId}/password`, {
        password: passwordEditor.password,
      });
      setPasswordEditor({
        open: false,
        staffId: null,
        staffName: "",
        password: "",
        confirmPassword: "",
      });
      await refreshAfterStaffChange(
        "تم تحديث كلمة المرور وإنهاء الجلسات المفتوحة للموظف.",
        passwordEditor.staffId,
      );
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث كلمة المرور"));
    } finally {
      setBusyAction("");
    }
  }

  async function confirmStatusChange() {
    if (!statusDialog.staffId) return;
    clearFeedback();
    setBusyAction(`status:${statusDialog.staffId}`);
    try {
      await api.patch(`/staff/${statusDialog.staffId}/status`, {
        status: statusDialog.nextStatus,
      });
      setStatusDialog({
        open: false,
        staffId: null,
        staffName: "",
        nextStatus: "SUSPENDED",
      });
      const successMessage =
        statusDialog.nextStatus === "ACTIVE"
          ? "تم تفعيل حساب الموظف."
          : statusDialog.nextStatus === "SUSPENDED"
            ? "تم تعليق حساب الموظف وإنهاء جلساته."
            : "تم حظر حساب الموظف وإنهاء جلساته.";
      await refreshAfterStaffChange(successMessage, statusDialog.staffId);
    } finally {
      setBusyAction("");
    }
  }

  const staffColumns: Column<StaffItem>[] = [
    {
      key: "name",
      header: "الموظف",
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-gray-500">{row.phone}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "الإنشاء",
      render: (row) => dateTime(row.createdAt),
    },
    {
      key: "role",
      header: "الدور",
      render: (row) => (
        <select
          value={row.staffRole?.id ?? ""}
          onChange={(event) => void assignRole(row.id, event.target.value)}
          disabled={
            roles.length === 0 || busyAction === `assign-role:${row.id}`
          }
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
      key: "actions",
      header: "إدارة الحساب",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() =>
              setPasswordEditor({
                open: true,
                staffId: row.id,
                staffName: row.name,
                password: "",
                confirmPassword: "",
              })
            }
            className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600"
          >
            تغيير كلمة المرور
          </button>
          {row.id !== profile?.user.id ? (
            <>
              {row.status !== "ACTIVE" ? (
                <button
                  onClick={() =>
                    setStatusDialog({
                      open: true,
                      staffId: row.id,
                      staffName: row.name,
                      nextStatus: "ACTIVE",
                    })
                  }
                  className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-600"
                >
                  تفعيل
                </button>
              ) : null}
              {row.status !== "SUSPENDED" ? (
                <button
                  onClick={() =>
                    setStatusDialog({
                      open: true,
                      staffId: row.id,
                      staffName: row.name,
                      nextStatus: "SUSPENDED",
                    })
                  }
                  className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-600"
                >
                  تعليق
                </button>
              ) : null}
              {row.status !== "BANNED" ? (
                <button
                  onClick={() =>
                    setStatusDialog({
                      open: true,
                      staffId: row.id,
                      staffName: row.name,
                      nextStatus: "BANNED",
                    })
                  }
                  className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600"
                >
                  حظر
                </button>
              ) : null}
            </>
          ) : (
            <span className="rounded bg-gray-500/10 px-2 py-1 text-xs text-gray-500">
              حسابك الحالي
            </span>
          )}
        </div>
      ),
    },
  ];

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
    {
      key: "actor",
      header: "المنفّذ",
      render: (row) => row.actor?.name ?? "-",
    },
    {
      key: "createdAt",
      header: "الوقت",
      render: (row) => dateTime(row.createdAt),
    },
  ];

  const totalStaffPages = Math.max(1, Math.ceil(staffTotal / STAFF_PAGE_SIZE));
  const selectedRoleUserCount = selectedRole?._count?.users ?? 0;

  return (
    <>
      <Topbar title="إدارة الوصول والأدوار" />
      <div className="space-y-6 p-6">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
            <KeyRound size={18} />
            <span className="font-medium">
              إدارة الأدوار والصلاحيات والموظفين من لوحة التحكم
            </span>
          </div>
          <div className="mt-1 text-sm text-indigo-700/80 dark:text-indigo-300/80">
            الأدوار: {num(roles.length)} · الموظفون: {num(staffTotal)} ·
            الصلاحيات: {num(permissions.length)}
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

        <section className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-5">
          <div className="md:col-span-5 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <UserRoundCog size={16} /> إنشاء حساب موظف جديد
          </div>
          <input
            value={staffForm.name}
            onChange={(event) =>
              setStaffForm({ ...staffForm, name: event.target.value })
            }
            placeholder="اسم الموظف"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            value={staffForm.phone}
            onChange={(event) =>
              setStaffForm({ ...staffForm, phone: event.target.value })
            }
            placeholder="الهاتف"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            type="password"
            value={staffForm.password}
            onChange={(event) =>
              setStaffForm({ ...staffForm, password: event.target.value })
            }
            placeholder="كلمة المرور (6 أحرف على الأقل)"
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <select
            value={staffForm.roleId}
            onChange={(event) =>
              setStaffForm({ ...staffForm, roleId: event.target.value })
            }
            disabled={roles.length === 0}
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            {roles.length === 0 ? (
              <option value="">أنشئ دورًا أولًا</option>
            ) : null}
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void createStaff()}
            disabled={
              busyAction === "create-staff" ||
              !staffForm.name ||
              !staffForm.phone ||
              !staffForm.password ||
              !staffForm.roleId
            }
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busyAction === "create-staff"
              ? "جارٍ الإنشاء..."
              : "إنشاء حساب موظف"}
          </button>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 xl:col-span-1">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">الأدوار</h2>
                <div className="text-sm text-gray-500">
                  اختر دورًا لمراجعة صلاحياته وإدارته.
                </div>
              </div>
              <button
                onClick={openCreateRoleDialog}
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
              >
                دور جديد
              </button>
            </div>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={
                    role.id === selectedRoleId
                      ? "flex w-full items-center justify-between rounded-lg bg-brand px-3 py-2 text-right text-sm text-white"
                      : "flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-right text-sm dark:border-gray-800"
                  }
                >
                  <span>{role.name}</span>
                  <span className="text-xs opacity-80">
                    {num(role._count?.users)}
                  </span>
                </button>
              ))}
              {!referenceLoading && roles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-700">
                  لا توجد أدوار بعد. ابدأ بإنشاء أول دور.
                </div>
              ) : null}
            </div>

            {selectedRole ? (
              <div className="mt-4 space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div>
                  <div className="font-medium">{selectedRole.name}</div>
                  <div className="mt-1 text-sm text-gray-500">
                    {selectedRole.description || "لا يوجد وصف لهذا الدور."}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  عدد المستخدمين المرتبطين: {num(selectedRoleUserCount)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEditRoleDialog(selectedRole)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                  >
                    <PencilLine size={14} /> تعديل الوصف
                  </button>
                  <button
                    onClick={() =>
                      setDeleteRoleDialog({ open: true, role: selectedRole })
                    }
                    disabled={selectedRoleUserCount > 0}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-50 dark:border-red-800"
                  >
                    <Trash2 size={14} /> حذف الدور
                  </button>
                </div>
                {selectedRoleUserCount > 0 ? (
                  <div className="text-xs text-amber-600 dark:text-amber-300">
                    لا يمكن حذف الدور طالما أنه مرتبط بموظفين.
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 xl:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">صلاحيات الدور</h2>
                <div className="text-sm text-gray-500">
                  {selectedRole?.name ?? "اختر دورًا من القائمة أولًا"}
                </div>
              </div>
              <button
                onClick={() => void saveRolePermissions()}
                disabled={
                  !selectedRoleId || busyAction === "save-role-permissions"
                }
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busyAction === "save-role-permissions"
                  ? "جارٍ الحفظ..."
                  : "حفظ الصلاحيات"}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {permissions.map((permission) => {
                const active = rolePermissionKeys.includes(permission.key);
                return (
                  <label
                    key={permission.id}
                    className={
                      active
                        ? "flex cursor-pointer items-start gap-3 rounded-lg border border-brand bg-brand/5 p-3"
                        : "flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                    }
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => togglePermission(permission.key)}
                      disabled={!selectedRoleId}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{permission.key}</div>
                      <div className="text-xs text-gray-500">
                        {permission.description ?? "-"}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">حسابات الموظفين</h2>
              <div className="text-sm text-gray-500">
                بحث + ترقيم + إدارة الأدوار والحالات وكلمات المرور.
              </div>
            </div>
            <input
              value={staffSearchInput}
              onChange={(event) => {
                setStaffPage(1);
                setStaffSearchInput(event.target.value);
              }}
              placeholder="بحث بالاسم أو الهاتف"
              className="min-w-72 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <DataTable
            columns={staffColumns}
            rows={staff}
            loading={staffLoading}
            empty="لا توجد حسابات موظفين"
          />
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
            <span>
              الصفحة {num(staffPage)} من {num(totalStaffPages)} · الإجمالي{" "}
              {num(staffTotal)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={staffPage <= 1 || staffLoading}
                onClick={() => setStaffPage((value) => value - 1)}
              >
                السابق
              </button>
              <button
                disabled={staffPage >= totalStaffPages || staffLoading}
                onClick={() => setStaffPage((value) => value + 1)}
              >
                التالي
              </button>
            </div>
          </div>
        </section>

        {canReviewAudit ? (
          <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={18} />
              <div>
                <h2 className="font-bold">آخر تغييرات الوصول والأدوار</h2>
                <div className="text-sm text-gray-500">
                  معاينة سريعة لآخر عمليات RBAC والموظفين المسجلة في Audit Log.
                </div>
              </div>
            </div>
            <DataTable
              columns={auditColumns}
              rows={recentAudit}
              loading={auditLoading}
              empty="لا توجد سجلات تدقيق حديثة"
            />
          </section>
        ) : null}
      </div>

      <Modal
        open={roleEditor.open}
        onClose={() =>
          setRoleEditor({
            open: false,
            roleId: null,
            name: "",
            description: "",
          })
        }
        title={roleEditor.roleId ? "تعديل الدور" : "إنشاء دور جديد"}
        footer={
          <>
            <button
              onClick={() =>
                setRoleEditor({
                  open: false,
                  roleId: null,
                  name: "",
                  description: "",
                })
              }
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void submitRoleEditor()}
              disabled={
                busyAction === "create-role" ||
                busyAction === "update-role" ||
                (!roleEditor.roleId && !roleEditor.name.trim())
              }
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyAction === "create-role" || busyAction === "update-role"
                ? "جارٍ الحفظ..."
                : "حفظ"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">اسم الدور</label>
            <input
              value={roleEditor.name}
              onChange={(event) =>
                setRoleEditor({ ...roleEditor, name: event.target.value })
              }
              disabled={Boolean(roleEditor.roleId)}
              placeholder="مثال: Operations Manager"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900"
            />
            {roleEditor.roleId ? (
              <p className="mt-1 text-xs text-gray-500">
                اسم الدور ثابت حاليًا، ويمكن تعديل الوصف والصلاحيات فقط.
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">وصف الدور</label>
            <textarea
              value={roleEditor.description}
              onChange={(event) =>
                setRoleEditor({
                  ...roleEditor,
                  description: event.target.value,
                })
              }
              rows={4}
              placeholder="ما حدود هذا الدور وما الذي يستطيع الوصول إليه؟"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={passwordEditor.open}
        onClose={() =>
          setPasswordEditor({
            open: false,
            staffId: null,
            staffName: "",
            password: "",
            confirmPassword: "",
          })
        }
        title={`تغيير كلمة مرور ${passwordEditor.staffName}`}
        footer={
          <>
            <button
              onClick={() =>
                setPasswordEditor({
                  open: false,
                  staffId: null,
                  staffName: "",
                  password: "",
                  confirmPassword: "",
                })
              }
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void submitPasswordReset()}
              disabled={busyAction === "reset-password"}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyAction === "reset-password"
                ? "جارٍ الحفظ..."
                : "تحديث كلمة المرور"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            type="password"
            value={passwordEditor.password}
            onChange={(event) =>
              setPasswordEditor({
                ...passwordEditor,
                password: event.target.value,
              })
            }
            placeholder="كلمة المرور الجديدة"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            type="password"
            value={passwordEditor.confirmPassword}
            onChange={(event) =>
              setPasswordEditor({
                ...passwordEditor,
                confirmPassword: event.target.value,
              })
            }
            placeholder="تأكيد كلمة المرور"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
          <p className="text-xs text-gray-500">
            عند تغيير كلمة المرور سيتم إنهاء الجلسات المفتوحة للموظف تلقائيًا.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={statusDialog.open}
        title={
          statusDialog.nextStatus === "ACTIVE"
            ? "تفعيل حساب الموظف"
            : statusDialog.nextStatus === "SUSPENDED"
              ? "تعليق حساب الموظف"
              : "حظر حساب الموظف"
        }
        message={
          statusDialog.nextStatus === "ACTIVE"
            ? `سيتم تفعيل ${statusDialog.staffName} وإعادة السماح بالدخول.`
            : `سيتم ${statusDialog.nextStatus === "SUSPENDED" ? "تعليق" : "حظر"} ${statusDialog.staffName} وإنهاء جلساته الحالية.`
        }
        tone={statusDialog.nextStatus === "ACTIVE" ? "brand" : "warning"}
        confirmLabel={
          statusDialog.nextStatus === "ACTIVE"
            ? "تفعيل"
            : statusDialog.nextStatus === "SUSPENDED"
              ? "تعليق"
              : "حظر"
        }
        onCancel={() =>
          setStatusDialog({
            open: false,
            staffId: null,
            staffName: "",
            nextStatus: "SUSPENDED",
          })
        }
        onConfirm={confirmStatusChange}
      />

      <ConfirmDialog
        open={deleteRoleDialog.open}
        title="حذف الدور"
        message={
          deleteRoleDialog.role
            ? `سيتم حذف الدور ${deleteRoleDialog.role.name} نهائيًا طالما لا يوجد موظفون مرتبطون به.`
            : "سيتم حذف هذا الدور نهائيًا."
        }
        tone="danger"
        confirmLabel="حذف الدور"
        onCancel={() => setDeleteRoleDialog({ open: false, role: null })}
        onConfirm={deleteRole}
      />
    </>
  );
}
