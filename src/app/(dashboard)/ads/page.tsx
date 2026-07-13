"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";

interface AdRow {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl?: string | null;
  placement: string;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder: number;
  createdAt: string;
}

const PLACEMENTS = ["PASSENGER_HOME", "PASSENGER_SEARCH", "DRIVER_HOME", "ALL"];

export default function AdsPage() {
  const [rows, setRows] = useState<AdRow[]>([]);
  const [placement, setPlacement] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    imageUrl: "",
    targetUrl: "",
    placement: "PASSENGER_HOME",
    isActive: true,
    startsAt: "",
    endsAt: "",
    sortOrder: "0",
  });

  const load = useCallback(() => {
    setError("");
    api
      .get("/ads", { params: { placement: placement || undefined } })
      .then((response) => setRows(response.data ?? []))
      .catch((loadError) => {
        setRows([]);
        setError(getApiErrorMessage(loadError, "تعذّر تحميل الإعلانات"));
      });
  }, [placement]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAd() {
    try {
      await api.post("/ads", {
        title: form.title,
        imageUrl: form.imageUrl,
        targetUrl: form.targetUrl || undefined,
        placement: form.placement,
        isActive: form.isActive,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
        sortOrder: Number(form.sortOrder || 0),
      });
      setForm({ title: "", imageUrl: "", targetUrl: "", placement: "PASSENGER_HOME", isActive: true, startsAt: "", endsAt: "", sortOrder: "0" });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر إنشاء الإعلان"));
    }
  }

  async function toggleActive(row: AdRow) {
    try {
      await api.patch(`/ads/${row.id}`, { isActive: !row.isActive });
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث حالة الإعلان"));
    }
  }

  async function removeAd(id: string) {
    if (!window.confirm("تأكيد حذف الإعلان؟")) return;
    try {
      await api.delete(`/ads/${id}`);
      load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر حذف الإعلان"));
    }
  }

  const columns: Column<AdRow>[] = [
    { key: "title", header: "العنوان", render: (row) => <div><div className="font-medium">{row.title}</div><div className="text-xs text-gray-500">{row.imageUrl}</div></div> },
    { key: "placement", header: "الموضع", render: (row) => row.placement },
    { key: "sortOrder", header: "الترتيب", render: (row) => num(row.sortOrder) },
    { key: "isActive", header: "الحالة", render: (row) => <StatusBadge status={row.isActive ? "ACTIVE" : "OFFLINE"} /> },
    { key: "startsAt", header: "من", render: (row) => dateTime(row.startsAt) },
    { key: "endsAt", header: "إلى", render: (row) => dateTime(row.endsAt) },
    {
      key: "actions",
      header: "إجراءات",
      render: (row) => (
        <div className="flex gap-1">
          <button onClick={() => void toggleActive(row)} className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600">{row.isActive ? "إيقاف" : "تفعيل"}</button>
          <button onClick={() => void removeAd(row.id)} className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600">حذف</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Topbar title="مركز الإعلانات" />
      <div className="space-y-6 p-6">
        <div className="rounded-xl border border-pink-200 bg-pink-50 p-4 dark:border-pink-900/40 dark:bg-pink-950/20">
          <div className="flex items-center gap-2 text-pink-700 dark:text-pink-300">
            <Megaphone size={18} />
            <span className="font-medium">إدارة الإعلانات المركزية التي تظهر في التطبيقات</span>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-4">
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="عنوان الإعلان" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="رابط الصورة" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <input value={form.targetUrl} onChange={(event) => setForm({ ...form, targetUrl: event.target.value })} placeholder="رابط التحويل (اختياري)" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <select value={form.placement} onChange={(event) => setForm({ ...form, placement: event.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">{PLACEMENTS.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <input value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} placeholder="الترتيب" className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> نشط</label>
          <button onClick={() => void createAd()} disabled={!form.title || !form.imageUrl} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50 md:col-span-4">إنشاء إعلان</button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={placement} onChange={(event) => setPlacement(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
            <option value="">كل المواضع</option>
            {PLACEMENTS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <DataTable columns={columns} rows={rows} empty="لا توجد إعلانات" />
      </div>
    </>
  );
}
