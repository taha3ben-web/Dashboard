"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, Column } from "@/components/DataTable";
import { api } from "@/lib/api";
import { num, dateTime, money } from "@/lib/format";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

interface Coupon {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  maxUses?: number | null;
  usedCount: number;
  firstRideOnly: boolean;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

const EMPTY = {
  code: "",
  type: "PERCENT" as "PERCENT" | "FIXED",
  value: "",
  maxUses: "",
  firstRideOnly: false,
};

export default function CouponsPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canManageCoupons = can("coupons.manage");

  const load = useCallback(() => {
    api
      .get("/coupons", { params: { page, limit: 20 } })
      .then((r) => {
        setRows(r.data.items ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => {});
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!canManageCoupons) return;
    setError("");
    if (!form.code.trim() || !form.value) {
      setError("الرمز والقيمة مطلوبان");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        firstRideOnly: form.firstRideOnly,
      };
      if (form.maxUses) payload.maxUses = Number(form.maxUses);
      await api.post("/coupons", payload);
      setForm(EMPTY);
      setPage(1);
      load();
    } catch {
      setError("تعذّر إنشاء القسيمة (ربما الرمز مكرر)");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Coupon) {
    if (!canManageCoupons) return;
    await api.patch(`/coupons/${c.id}`, { isActive: !c.isActive });
    load();
  }

  async function remove(id: string) {
    if (!canManageCoupons) return;
    await api.delete(`/coupons/${id}`);
    load();
  }

  const columns: Column<Coupon>[] = [
    { key: "code", header: "الرمز", render: (c) => <b>{c.code}</b> },
    {
      key: "value",
      header: "الخصم",
      render: (c) => (c.type === "PERCENT" ? `${c.value}%` : money(c.value)),
    },
    {
      key: "uses",
      header: "الاستخدام",
      render: (c) =>
        `${num(c.usedCount)} / ${c.maxUses ? num(c.maxUses) : "∞"}`,
    },
    {
      key: "firstRideOnly",
      header: "أول رحلة",
      render: (c) => (c.firstRideOnly ? "نعم" : "-"),
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (c) => (
        <button
          onClick={() => toggle(c)}
          disabled={!canManageCoupons}
          className={
            c.isActive
              ? "rounded bg-green-500/10 px-2 py-1 text-xs text-green-500 disabled:cursor-not-allowed disabled:opacity-60"
              : "rounded bg-gray-500/10 px-2 py-1 text-xs text-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {c.isActive ? "مفعّلة" : "موقوفة"}
        </button>
      ),
    },
    {
      key: "expiresAt",
      header: "تنتهي",
      render: (c) => (c.expiresAt ? dateTime(c.expiresAt) : "-"),
    },
    {
      key: "actions",
      header: "حذف",
      render: (c) => (
        canManageCoupons ? (
          <button
            onClick={() => remove(c.id)}
            className="rounded bg-red-500/10 p-1.5 text-red-500"
          >
            <Trash2 size={14} />
          </button>
        ) : (
          <span className="text-xs text-gray-400">عرض فقط</span>
        )
      ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="قسائم الخصم" />
      <div className="space-y-6 p-6">
        {!canManageCoupons ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذه الصفحة متاحة لك للقراءة فقط. إنشاء القسائم أو تعديل حالتها أو حذفها متاح فقط لصلاحية إدارة الكوبونات.
          </div>
        ) : null}

        {canManageCoupons ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-bold">إنشاء قسيمة جديدة</h2>
            <div className="flex flex-wrap items-end gap-3">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="الرمز (مثل NOVA10)"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
              />
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as "PERCENT" | "FIXED",
                  })
                }
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="PERCENT">نسبة %</option>
                <option value="FIXED">مبلغ ثابت</option>
              </select>
              <input
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                type="number"
                placeholder="القيمة"
                className="w-28 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
              />
              <input
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                type="number"
                placeholder="أقصى استخدام (اختياري)"
                className="w-44 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
              />
              <label className="flex items-center gap-2 text-sm text-gray-500">
                <input
                  type="checkbox"
                  checked={form.firstRideOnly}
                  onChange={(e) =>
                    setForm({ ...form, firstRideOnly: e.target.checked })
                  }
                />
                أول رحلة فقط
              </label>
              <button
                onClick={create}
                disabled={saving}
                className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <Plus size={16} /> إضافة
              </button>
            </div>
            {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
          </div>
        ) : null}

        <DataTable columns={columns} rows={rows} />

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>الإجمالي: {num(total)}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
            >
              السابق
            </button>
            <span className="px-2 py-1">
              {page} / {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
            >
              التالي
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
