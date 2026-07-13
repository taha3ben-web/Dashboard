"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";

interface ComplaintRow {
  id: string;
  message: string;
  status: string;
  createdAt: string;
  fromUser?: { name?: string; phone?: string };
  againstUser?: { name?: string; phone?: string } | null;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation?: string | null;
  createdAt: string;
}

const STATUSES = ["OPEN", "REVIEWING", "RESOLVED"];

export default function SafetyPage() {
  const [rows, setRows] = useState<ComplaintRow[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [contactUserId, setContactUserId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    api
      .get("/support/complaints", { params: { page, limit: 20 } })
      .then((response) => {
        setRows(response.data.items ?? []);
        setTotal(response.data.total ?? 0);
      })
      .catch((loadError) => {
        setRows([]);
        setTotal(0);
        setError(getApiErrorMessage(loadError, "تعذّر تحميل مؤشرات السلامة"));
      });
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/support/complaints/${id}/status`, { status });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث حالة الشكوى"));
    }
  }

  async function loadContacts() {
    if (!contactUserId.trim()) return;
    try {
      const response = await api.get(`/emergency-contacts/user/${contactUserId.trim()}`);
      setContacts(response.data ?? []);
    } catch (actionError) {
      setContacts([]);
      setError(getApiErrorMessage(actionError, "تعذّر تحميل جهات الطوارئ"));
    }
  }

  const columns: Column<ComplaintRow>[] = [
    { key: "fromUser", header: "المبلّغ", render: (row) => <div><div className="font-medium">{row.fromUser?.name ?? "-"}</div><div className="text-xs text-gray-500">{row.fromUser?.phone ?? "-"}</div></div> },
    { key: "againstUser", header: "ضد", render: (row) => row.againstUser?.name ?? "-" },
    { key: "message", header: "البلاغ/الشكوى", render: (row) => row.message },
    { key: "status", header: "الحالة", render: (row) => <StatusBadge status={row.status} /> },
    { key: "createdAt", header: "الوقت", render: (row) => dateTime(row.createdAt) },
    {
      key: "actions",
      header: "إجراء",
      render: (row) => (
        <select value={row.status} onChange={(event) => void updateStatus(row.id, event.target.value)} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900">
          {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      ),
    },
  ];

  const contactColumns: Column<EmergencyContact>[] = [
    { key: "name", header: "الاسم", render: (row) => row.name },
    { key: "phone", header: "الهاتف", render: (row) => row.phone },
    { key: "relation", header: "الصلة", render: (row) => row.relation ?? "-" },
    { key: "createdAt", header: "الإنشاء", render: (row) => dateTime(row.createdAt) },
  ];

  return (
    <>
      <Topbar title="مركز السلامة" />
      <div className="space-y-6 p-6">
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <ShieldAlert size={18} />
            <span className="font-medium">متابعة الشكاوى عالية الحساسية وجهات الطوارئ من الخادم</span>
          </div>
          <div className="mt-1 text-sm text-orange-700/80 dark:text-orange-300/80">الشكاوى المعروضة: {num(total)} · جهات الطوارئ المعروضة: {num(contacts.length)}</div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <input value={contactUserId} onChange={(event) => setContactUserId(event.target.value)} placeholder="أدخل معرّف المستخدم لجلب جهات طوارئه" className="min-w-80 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <button onClick={() => void loadContacts()} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">عرض جهات الطوارئ</button>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <section>
          <h2 className="mb-3 font-bold">الشكاوى المرتبطة بالسلامة</h2>
          <DataTable columns={columns} rows={rows} empty="لا توجد شكاوى" />
        </section>

        <section>
          <h2 className="mb-3 font-bold">جهات الطوارئ</h2>
          <DataTable columns={contactColumns} rows={contacts} empty="لا توجد جهات طوارئ لهذا المستخدم" />
        </section>

        <div className="flex justify-between text-sm text-gray-500">
          <span>الإجمالي: {num(total)}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>السابق</button>
            <span>{page}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage((value) => value + 1)}>التالي</button>
          </div>
        </div>
      </div>
    </>
  );
}
