"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, Trash2, Pencil } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

type ContentBlock = {
  id: string;
  slug: string;
  locale: string;
  type: string;
  audience: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  tags: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
};

const TYPES = ["ANNOUNCEMENT", "ONBOARDING", "FAQ", "INFO", "HELP", "PROMO"];
const AUDIENCES = ["ALL", "PASSENGER", "DRIVER"];
const LOCALES = ["ar", "en", "fr"];

type FormState = {
  slug: string;
  locale: string;
  type: string;
  audience: string;
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  tags: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY_FORM: FormState = {
  slug: "",
  locale: "ar",
  type: "INFO",
  audience: "ALL",
  title: "",
  body: "",
  imageUrl: "",
  ctaLabel: "",
  ctaUrl: "",
  tags: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
  sortOrder: 0,
};

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ContentBlocksPage() {
  const { can } = useAuth();
  const canManage = can("settings.manage");
  const [rows, setRows] = useState<ContentBlock[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/content-blocks", { params: { page, limit } });
      setRows(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (row: ContentBlock) => {
    setEditingId(row.id);
    setForm({
      slug: row.slug,
      locale: row.locale,
      type: row.type,
      audience: row.audience,
      title: row.title,
      body: row.body,
      imageUrl: row.imageUrl ?? "",
      ctaLabel: row.ctaLabel ?? "",
      ctaUrl: row.ctaUrl ?? "",
      tags: (row.tags ?? []).join(", "),
      startsAt: row.startsAt ? row.startsAt.slice(0, 16) : "",
      endsAt: row.endsAt ? row.endsAt.slice(0, 16) : "",
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    });
    setShowForm(true);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        title: form.title,
        body: form.body,
        imageUrl: form.imageUrl.trim() || undefined,
        ctaLabel: form.ctaLabel.trim() || undefined,
        ctaUrl: form.ctaUrl.trim() || undefined,
        tags: parseCsv(form.tags),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editingId) {
        await api.patch(`/content-blocks/${editingId}`, payload);
      } else {
        await api.post("/content-blocks", {
          ...payload,
          slug: form.slug,
          locale: form.locale,
          audience: form.audience,
        });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: ContentBlock) => {
    if (!window.confirm(`حذف الكتلة "${row.title}"؟`)) return;
    setError(null);
    try {
      await api.delete(`/content-blocks/${row.id}`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const columns = useMemo<Column<ContentBlock>[]>(
    () => [
      { key: "slug", header: "المعرّف", render: (r) => <span className="font-mono text-xs">{r.slug}</span> },
      { key: "title", header: "العنوان", render: (r) => r.title },
      { key: "type", header: "النوع", render: (r) => r.type },
      { key: "audience", header: "الجمهور", render: (r) => r.audience },
      { key: "locale", header: "اللغة", render: (r) => r.locale },
      {
        key: "isActive",
        header: "الحالة",
        render: (r) => (
          <span className={r.isActive ? "text-emerald-600" : "text-slate-400"}>
            {r.isActive ? "مفعّل" : "موقوف"}
          </span>
        ),
      },
      { key: "updatedAt", header: "آخر تحديث", render: (r) => dateTime(r.updatedAt) },
      {
        key: "actions",
        header: "إجراءات",
        render: (r) =>
          canManage ? (
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="تعديل">
                <Pencil size={16} />
              </button>
              <button onClick={() => remove(r)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" aria-label="حذف">
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
    ],
    [canManage],
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <Topbar title="قوالب المحتوى" icon={FileText} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          محتوى ديناميكي يُدار من اللوحة (إعلانات/onboarding/FAQ) ويُعرض داخل التطبيق.
        </p>
        {canManage && (
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            <Plus size={16} /> كتلة جديدة
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="لا توجد كتل محتوى بعد"
      />

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">الإجمالي: {total}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border px-3 py-1 disabled:opacity-40">السابق</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">التالي</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">{editingId ? "تعديل كتلة محتوى" : "كتلة محتوى جديدة"}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">المعرّف (slug)
                <input disabled={!!editingId} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="rounded-lg border px-3 py-2 disabled:bg-slate-100" />
              </label>
              <label className="flex flex-col gap-1 text-sm">اللغة
                <select disabled={!!editingId} value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })} className="rounded-lg border px-3 py-2 disabled:bg-slate-100">
                  {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">النوع
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border px-3 py-2">
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">الجمهور
                <select disabled={!!editingId} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="rounded-lg border px-3 py-2 disabled:bg-slate-100">
                  {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">العنوان
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">المحتوى
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} className="rounded-lg border px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm">رابط الصورة
                <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="rounded-lg border px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm">الوسوم (مفصولة بفاصلة)
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="rounded-lg border px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm">نص الزر (CTA)
                <input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} className="rounded-lg border px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm">رابط الزر (CTA)
                <input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} className="rounded-lg border px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm">بداية العرض
                <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="rounded-lg border px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm">نهاية العرض
                <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="rounded-lg border px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm">الترتيب
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="rounded-lg border px-3 py-2" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                مفعّل
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-xl border px-4 py-2 text-sm">إلغاء</button>
              <button onClick={submit} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
