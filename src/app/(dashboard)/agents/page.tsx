"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";

interface RoleOption { id: string; name: string; }
interface CityOption { id: string; name: string; }
interface AgentRow {
  id: string;
  agentCode: string;
  status: string;
  notes?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  city?: { id: string; name: string } | null;
  user: { id: string; name: string; phone: string; status: string; staffRole?: { id: string; name: string } | null };
}

const STATUSES = ["", "ACTIVE", "SUSPENDED", "INVITED"];

export default function AgentsPage() {
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [cityId, setCityId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", password: "123456", agentCode: "", roleId: "", cityId: "", notes: "" });

  const load = useCallback(() => {
    setError("");
    api.get("/agents", { params: { page, limit: 20, status: status || undefined, cityId: cityId || undefined, search: search || undefined } })
      .then((response) => {
        setRows(response.data.items ?? []);
        setTotal(response.data.total ?? 0);
      })
      .catch((loadError) => {
        setRows([]);
        setTotal(0);
        setError(getApiErrorMessage(loadError, "تعذّر تحميل الوكلاء"));
      });
  }, [page, status, cityId, search]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    api.get("/agents/options").then((response) => {
      const nextRoles = response.data.roles ?? [];
      setRoles(nextRoles);
      setCities(response.data.cities ?? []);
      setForm((current) => ({ ...current, roleId: current.roleId || nextRoles[0]?.id || "" }));
    }).catch(() => {});
  }, []);

  async function createAgent() {
    try {
      await api.post("/agents", {
        ...form,
        cityId: form.cityId || undefined,
        notes: form.notes || undefined,
      });
      setForm({ name: "", phone: "", password: "123456", agentCode: "", roleId: roles[0]?.id ?? "", cityId: "", notes: "" });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنشاء الوكيل"));
    }
  }

  async function updateStatus(id: string, nextStatus: string) {
    const notes = window.prompt("ملاحظات الحالة:") ?? undefined;
    try {
      await api.patch(`/agents/${id}`, { status: nextStatus, notes });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث حالة الوكيل"));
    }
  }

  async function assignRole(id: string, roleId: string) {
    try {
      await api.patch(`/agents/${id}/role`, { roleId });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تغيير دور الوكيل"));
    }
  }

  const columns: Column<AgentRow>[] = [
    { key: "agent", header: "الوكيل", render: (row) => <div><div className="font-medium">{row.user.name}</div><div className="text-xs text-gray-500">{row.user.phone}</div></div> },
    { key: "agentCode", header: "الرمز", render: (row) => <span className="font-mono">{row.agentCode}</span> },
    { key: "city", header: "المدينة", render: (row) => row.city?.name ?? "-" },
    { key: "role", header: "الدور", render: (row) => <select value={row.user.staffRole?.id ?? ""} onChange={(event) => void assignRole(row.id, event.target.value)} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select> },
    { key: "status", header: "الحالة", render: (row) => <StatusBadge status={row.status} /> },
    { key: "lastLoginAt", header: "آخر دخول", render: (row) => dateTime(row.lastLoginAt) },
    { key: "actions", header: "إجراءات", render: (row) => <div className="flex gap-1"><button onClick={() => void updateStatus(row.id, "ACTIVE")} className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-600">تفعيل</button><button onClick={() => void updateStatus(row.id, "SUSPENDED")} className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-600">تعليق</button><button onClick={() => void updateStatus(row.id, "INVITED")} className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600">دعوة</button></div> },
  ];

  return (
    <>
      <Topbar title="إدارة الوكلاء" />
      <div className="space-y-4 p-6">
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-900/40 dark:bg-purple-950/20">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300"><Bot size={18} /><span className="font-medium">إدارة حسابات الوكلاء وأدوارهم ومدنهم من الخادم</span></div>
          <div className="mt-1 text-sm text-purple-700/80 dark:text-purple-300/80">الإجمالي الحالي: {num(total)}</div>
        </div>

        <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-4">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="اسم الوكيل" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="الهاتف" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <input value={form.agentCode} onChange={(event) => setForm({ ...form, agentCode: event.target.value })} placeholder="رمز الوكيل" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="كلمة المرور" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <select value={form.roleId} onChange={(event) => setForm({ ...form, roleId: event.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
          <select value={form.cityId} onChange={(event) => setForm({ ...form, cityId: event.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"><option value="">بدون مدينة</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select>
          <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="ملاحظات" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <button onClick={() => void createAgent()} disabled={!form.name || !form.phone || !form.agentCode || !form.password || !form.roleId} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">إنشاء وكيل</button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">{STATUSES.map((value) => <option key={value || 'all'} value={value}>{value || 'كل الحالات'}</option>)}</select>
          <select value={cityId} onChange={(event) => { setPage(1); setCityId(event.target.value); }} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"><option value="">كل المدن</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select>
          <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="بحث بالاسم أو الهاتف أو الرمز" className="min-w-72 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <DataTable columns={columns} rows={rows} empty="لا توجد حسابات وكلاء" />
        <div className="flex justify-between text-sm text-gray-500"><span>الإجمالي: {num(total)}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>السابق</button><span>{page}</span><button disabled={page * 20 >= total} onClick={() => setPage((value) => value + 1)}>التالي</button></div></div>
      </div>
    </>
  );
}
