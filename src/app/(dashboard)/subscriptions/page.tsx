"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, Column } from "@/components/DataTable";
import { api } from "@/lib/api";
import { num, dateTime, money } from "@/lib/format";
import { Plus, Power } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

type Interval = "MONTHLY" | "QUARTERLY" | "YEARLY";

interface Plan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  interval: Interval;
  benefitDiscountPct: number;
  benefitMaxDiscount?: number | null;
  isActive: boolean;
  sortOrder: number;
}

interface Subscription {
  id: string;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  autoRenew: boolean;
  currentPeriodEnd: string;
  createdAt: string;
  plan: { code: string; name: string; price: number };
  user: { id: string; name: string; phone: string };
}

const INTERVAL_LABEL: Record<Interval, string> = {
  MONTHLY: "شهري",
  QUARTERLY: "ربع سنوي",
  YEARLY: "سنوي",
};

const STATUS_LABEL: Record<Subscription["status"], string> = {
  ACTIVE: "فعّال",
  CANCELLED: "ملغيّ التجديد",
  EXPIRED: "منتهٍ",
};

const EMPTY = {
  code: "",
  name: "",
  price: "",
  interval: "MONTHLY" as Interval,
  benefitDiscountPct: "",
  benefitMaxDiscount: "",
};

export default function SubscriptionsPage() {
  const { can } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canManage = can("subscriptions.manage");

  const loadPlans = useCallback(() => {
    api
      .get("/subscriptions/plans/all")
      .then((r) => setPlans(r.data ?? []))
      .catch(() => {});
  }, []);

  const loadSubs = useCallback(() => {
    api
      .get("/subscriptions", { params: { page, limit: 20 } })
      .then((r) => {
        setSubs(r.data.items ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => {});
  }, [page]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  async function create() {
    if (!canManage) return;
    setError("");
    if (!form.code.trim() || !form.name.trim() || form.price === "") {
      setError("الرمز والاسم والسعر مطلوبة");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        price: Number(form.price),
        interval: form.interval,
      };
      if (form.benefitDiscountPct !== "")
        payload.benefitDiscountPct = Number(form.benefitDiscountPct);
      if (form.benefitMaxDiscount !== "")
        payload.benefitMaxDiscount = Number(form.benefitMaxDiscount);
      await api.post("/subscriptions/plans", payload);
      setForm(EMPTY);
      loadPlans();
    } catch {
      setError("تعذّر إنشاء الخطة (ربما الرمز مكرر)");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: Plan) {
    if (!canManage) return;
    if (p.isActive) {
      await api.delete(`/subscriptions/plans/${p.id}`);
    } else {
      await api.patch(`/subscriptions/plans/${p.id}`, { isActive: true });
    }
    loadPlans();
  }

  const planColumns: Column<Plan>[] = [
    { key: "code", header: "الرمز", render: (p) => <b>{p.code}</b> },
    { key: "name", header: "الاسم", render: (p) => p.name },
    { key: "price", header: "السعر", render: (p) => money(p.price) },
    {
      key: "interval",
      header: "الدورة",
      render: (p) => INTERVAL_LABEL[p.interval],
    },
    {
      key: "benefit",
      header: "المنفعة",
      render: (p) =>
        p.benefitDiscountPct
          ? `${p.benefitDiscountPct}%${
              p.benefitMaxDiscount ? ` (أقصى ${money(p.benefitMaxDiscount)})` : ""
            }`
          : "-",
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (p) => (
        <button
          onClick={() => toggle(p)}
          disabled={!canManage}
          className={
            p.isActive
              ? "rounded bg-green-500/10 px-2 py-1 text-xs text-green-500 disabled:cursor-not-allowed disabled:opacity-60"
              : "rounded bg-gray-500/10 px-2 py-1 text-xs text-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {p.isActive ? "مفعّلة" : "موقوفة"}
        </button>
      ),
    },
  ];

  const subColumns: Column<Subscription>[] = [
    {
      key: "user",
      header: "المستخدم",
      render: (s) => (
        <div>
          <div className="font-medium">{s.user?.name ?? "-"}</div>
          <div className="text-xs text-gray-400">{s.user?.phone}</div>
        </div>
      ),
    },
    { key: "plan", header: "الخطة", render: (s) => s.plan?.name ?? "-" },
    {
      key: "status",
      header: "الحالة",
      render: (s) => STATUS_LABEL[s.status],
    },
    {
      key: "autoRenew",
      header: "تجديد تلقائي",
      render: (s) => (s.autoRenew ? "نعم" : "-"),
    },
    {
      key: "currentPeriodEnd",
      header: "نهاية الفترة",
      render: (s) => dateTime(s.currentPeriodEnd),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="الاشتراكات" />
      <div className="space-y-6 p-6">
        {!canManage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذه الصفحة متاحة للقراءة فقط. إنشاء الخطط أو تعديلها يتطلّب صلاحية إدارة الاشتراكات.
          </div>
        ) : null}

        {canManage ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-bold">إنشاء خطة اشتراك جديدة</h2>
            <div className="flex flex-wrap items-end gap-3">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="الرمز (مثل NOVA_PLUS)"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
              />
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="الاسم"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
              />
              <input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                type="number"
                placeholder="السعر"
                className="w-28 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
              />
              <select
                value={form.interval}
                onChange={(e) =>
                  setForm({ ...form, interval: e.target.value as Interval })
                }
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="MONTHLY">شهري</option>
                <option value="QUARTERLY">ربع سنوي</option>
                <option value="YEARLY">سنوي</option>
              </select>
              <input
                value={form.benefitDiscountPct}
                onChange={(e) =>
                  setForm({ ...form, benefitDiscountPct: e.target.value })
                }
                type="number"
                placeholder="خصم % (اختياري)"
                className="w-36 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
              />
              <input
                value={form.benefitMaxDiscount}
                onChange={(e) =>
                  setForm({ ...form, benefitMaxDiscount: e.target.value })
                }
                type="number"
                placeholder="أقصى خصم (اختياري)"
                className="w-40 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
              />
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

        <div>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Power size={14} /> خطط الاشتراك
          </h2>
          <DataTable columns={planColumns} rows={plans} />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-bold">المشتركون</h2>
          <DataTable columns={subColumns} rows={subs} />
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
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
      </div>
    </>
  );
}
