"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

interface AppVersion {
  id: string;
  platform: string;
  version: string;
  minSupported?: string | null;
  forceUpdate: boolean;
  url?: string | null;
  createdAt: string;
}

const EMPTY = {
  platform: "android",
  version: "",
  minSupported: "",
  forceUpdate: false,
  url: "",
};

export default function AppVersionsPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<AppVersion[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const canManageSettings = can("settings.manage");

  const load = useCallback(() => {
    api
      .get("/app-versions")
      .then((r) => setRows(r.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!canManageSettings) return;
    if (!form.version.trim()) return;
    setSaving(true);
    try {
      await api.post("/app-versions", {
        platform: form.platform,
        version: form.version.trim(),
        minSupported: form.minSupported.trim() || undefined,
        forceUpdate: form.forceUpdate,
        url: form.url.trim() || undefined,
      });
      setForm({ ...EMPTY });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!canManageSettings) return;
    await api.delete(`/app-versions/${id}`);
    load();
  }

  const columns: Column<AppVersion>[] = [
    { key: "platform", header: "المنصة", render: (v) => <b>{v.platform}</b> },
    { key: "version", header: "الإصدار", render: (v) => v.version },
    {
      key: "minSupported",
      header: "أدنى إصدار مدعوم",
      render: (v) => v.minSupported ?? "-",
    },
    {
      key: "forceUpdate",
      header: "تحديث إجباري",
      render: (v) => (
        <StatusBadge status={v.forceUpdate ? "ACTIVE" : "OFFLINE"} />
      ),
    },
    {
      key: "url",
      header: "الرابط",
      render: (v) =>
        v.url ? (
          <a
            href={v.url}
            target="_blank"
            rel="noreferrer"
            className="text-brand underline"
          >
            فتح
          </a>
        ) : (
          "-"
        ),
    },
    {
      key: "createdAt",
      header: "التاريخ",
      render: (v) => dateTime(v.createdAt),
    },
    {
      key: "actions",
      header: "حذف",
      render: (v) => (
        canManageSettings ? (
          <button
            onClick={() => remove(v.id)}
            className="flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
          >
            <Trash2 size={14} />
            حذف
          </button>
        ) : (
          <span className="text-xs text-gray-400">عرض فقط</span>
        )
      ),
    },
  ];

  return (
    <>
      <Topbar title="إصدارات التطبيق" />
      <div className="space-y-6 p-6">
        {!canManageSettings ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذه الصفحة في وضع القراءة فقط لهذا الدور. إضافة الإصدارات أو حذفها متاح فقط لصلاحية إدارة الإعدادات.
          </div>
        ) : null}

        {canManageSettings ? (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-lg font-bold">إضافة إصدار جديد</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-gray-700"
              >
                <option value="android">Android</option>
                <option value="ios">iOS</option>
              </select>
              <input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="الإصدار (مثال 1.2.0)"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-gray-700"
              />
              <input
                value={form.minSupported}
                onChange={(e) =>
                  setForm({ ...form, minSupported: e.target.value })
                }
                placeholder="أدنى إصدار مدعوم"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-gray-700"
              />
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="رابط التحديث"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-gray-700"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.forceUpdate}
                  onChange={(e) =>
                    setForm({ ...form, forceUpdate: e.target.checked })
                  }
                />
                تحديث إجباري
              </label>
            </div>
            <button
              onClick={create}
              disabled={saving || !form.version.trim()}
              className="mt-3 flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              <Plus size={16} />
              إضافة
            </button>
          </section>
        ) : null}

        <DataTable columns={columns} rows={rows} />
      </div>
    </>
  );
}
