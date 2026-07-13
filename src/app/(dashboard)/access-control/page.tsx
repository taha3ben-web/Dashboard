"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

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

export default function AccessControlPage() {
  const { profile } = useAuth();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [rolePermissionKeys, setRolePermissionKeys] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [staffForm, setStaffForm] = useState({ name: "", phone: "", password: "", roleId: "" });
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });

  const load = useCallback(() => {
    setError("");
    Promise.all([
      api.get("/rbac/roles"),
      api.get("/rbac/permissions"),
      api.get("/staff", { params: { page: 1, limit: 100 } }),
    ])
      .then(([rolesResponse, permissionsResponse, staffResponse]) => {
        const nextRoles: RoleItem[] = rolesResponse.data ?? [];
        const nextPermissions: PermissionItem[] = permissionsResponse.data ?? [];
        const nextStaff: StaffItem[] = staffResponse.data.items ?? [];
        setRoles(nextRoles);
        setPermissions(nextPermissions);
        setStaff(nextStaff);
        const nextRoleId = selectedRoleId || nextRoles[0]?.id || "";
        setSelectedRoleId(nextRoleId);
        const currentRole = nextRoles.find((role: RoleItem) => role.id === nextRoleId) ?? nextRoles[0];
        setRolePermissionKeys(
          currentRole?.permissions?.map(
            (item: { permission: PermissionItem }) => item.permission.key,
          ) ?? [],
        );
        setStaffForm((current) => ({ ...current, roleId: current.roleId || nextRoles[0]?.id || "" }));
      })
      .catch((loadError) => {
        setRoles([]);
        setPermissions([]);
        setStaff([]);
        setError(getApiErrorMessage(loadError, "تعذّر تحميل إدارة الوصول"));
      });
  }, [selectedRoleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  useEffect(() => {
    if (selectedRole) {
      setRolePermissionKeys(selectedRole.permissions.map((item) => item.permission.key));
    }
  }, [selectedRole]);

  function togglePermission(key: string) {
    setRolePermissionKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  async function saveRolePermissions() {
    if (!selectedRoleId) return;
    try {
      await api.put(`/rbac/roles/${selectedRoleId}/permissions`, {
        permissionKeys: rolePermissionKeys,
      });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر حفظ صلاحيات الدور"));
    }
  }

  async function createStaff() {
    try {
      await api.post("/staff", staffForm);
      setStaffForm({ name: "", phone: "", password: "", roleId: roles[0]?.id ?? "" });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنشاء حساب الموظف"));
    }
  }

  async function assignRole(staffId: string, roleId: string) {
    try {
      await api.patch(`/staff/${staffId}/role`, { roleId });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تغيير الدور"));
    }
  }

  async function resetPassword(staffId: string) {
    const password = window.prompt("أدخل كلمة المرور الجديدة (6 أحرف على الأقل):");
    if (!password) return;
    try {
      await api.patch(`/staff/${staffId}/password`, { password });
      setError("");
      window.alert("تم تحديث كلمة المرور وإنهاء جلسات الموظف المفتوحة.");
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث كلمة المرور"));
    }
  }

  async function setStaffStatus(
    staffId: string,
    status: "ACTIVE" | "SUSPENDED" | "BANNED",
  ) {
    try {
      await api.patch(`/staff/${staffId}/status`, { status });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث حالة الموظف"));
    }
  }

  async function createRole() {
    try {
      await api.post("/rbac/roles", {
        name: roleForm.name,
        description: roleForm.description || undefined,
        permissionKeys: [],
      });
      setRoleForm({ name: "", description: "" });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنشاء الدور"));
    }
  }

  const staffColumns: Column<StaffItem>[] = [
    { key: "name", header: "الاسم", render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-gray-500">{row.phone}</div></div> },
    { key: "status", header: "الحالة", render: (row) => <StatusBadge status={row.status} /> },
    { key: "createdAt", header: "الإنشاء", render: (row) => dateTime(row.createdAt) },
    {
      key: "role",
      header: "الدور",
      render: (row) => (
        <select
          value={row.staffRole?.id ?? ""}
          onChange={(event) => void assignRole(row.id, event.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>{role.name}</option>
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
            onClick={() => void resetPassword(row.id)}
            className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600"
          >
            تغيير كلمة المرور
          </button>
          {row.id !== profile?.user.id ? (
            row.status === "ACTIVE" ? (
              <button
                onClick={() => void setStaffStatus(row.id, "SUSPENDED")}
                className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-600"
              >
                تعليق
              </button>
            ) : (
              <button
                onClick={() => void setStaffStatus(row.id, "ACTIVE")}
                className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-600"
              >
                تفعيل
              </button>
            )
          ) : (
            <span className="rounded bg-gray-500/10 px-2 py-1 text-xs text-gray-500">
              حسابك الحالي
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Topbar title="إدارة الوصول والأدوار" />
      <div className="space-y-6 p-6">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
            <KeyRound size={18} />
            <span className="font-medium">إدارة الأدوار والصلاحيات والموظفين من لوحة التحكم</span>
          </div>
          <div className="mt-1 text-sm text-indigo-700/80 dark:text-indigo-300/80">
            الأدوار: {num(roles.length)} · الموظفون: {num(staff.length)} · الصلاحيات: {num(permissions.length)}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-4">
          <input value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} placeholder="اسم الموظف" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <input value={staffForm.phone} onChange={(event) => setStaffForm({ ...staffForm, phone: event.target.value })} placeholder="الهاتف" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <input type="password" value={staffForm.password} onChange={(event) => setStaffForm({ ...staffForm, password: event.target.value })} placeholder="كلمة المرور (6 أحرف على الأقل)" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <select value={staffForm.roleId} onChange={(event) => setStaffForm({ ...staffForm, roleId: event.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
          <button onClick={() => void createStaff()} disabled={!staffForm.name || !staffForm.phone || !staffForm.password || !staffForm.roleId} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50 md:col-span-4">إنشاء حساب موظف</button>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 xl:col-span-1">
            <h2 className="mb-3 text-lg font-semibold">الأدوار</h2>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={role.id === selectedRoleId ? "flex w-full items-center justify-between rounded-lg bg-brand px-3 py-2 text-sm text-white" : "flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"}
                >
                  <span>{role.name}</span>
                  <span className="text-xs opacity-80">{num(role._count?.users)}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-800">
              <input value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} placeholder="اسم الدور الجديد" className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
              <input value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} placeholder="وصف الدور" className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
              <button onClick={() => void createRole()} disabled={!roleForm.name} className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900 disabled:opacity-50">إنشاء دور</button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 xl:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">صلاحيات الدور</h2>
                <div className="text-sm text-gray-500">{selectedRole?.name ?? "-"}</div>
              </div>
              <button onClick={() => void saveRolePermissions()} disabled={!selectedRoleId} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">حفظ الصلاحيات</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {permissions.map((permission) => {
                const active = rolePermissionKeys.includes(permission.key);
                return (
                  <label key={permission.id} className={active ? "flex cursor-pointer items-start gap-3 rounded-lg border border-brand bg-brand/5 p-3" : "flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"}>
                    <input type="checkbox" checked={active} onChange={() => togglePermission(permission.key)} className="mt-1" />
                    <div>
                      <div className="font-medium">{permission.key}</div>
                      <div className="text-xs text-gray-500">{permission.description ?? "-"}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <section>
          <h2 className="mb-3 font-bold">حسابات الموظفين</h2>
          <DataTable columns={staffColumns} rows={staff} empty="لا توجد حسابات موظفين" />
        </section>
      </div>
    </>
  );
}
