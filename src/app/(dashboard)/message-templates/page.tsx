"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

type Category = "TRANSACTIONAL" | "MARKETING" | "SYSTEM" | "SUPPORT";
type Channel = "PUSH" | "SMS" | "EMAIL" | "IN_APP";

interface TemplateRow {
  id: string;
  key: string;
  locale: string;
  name: string;
  description?: string | null;
  category: Category;
  channel?: Channel | null;
  title: string;
  body: string;
  variables: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "TRANSACTIONAL", label: "معاملاتي" },
  { value: "MARKETING", label: "تسويقي" },
  { value: "SYSTEM", label: "نظامي" },
  { value: "SUPPORT", label: "دعم" },
];

const CHANNELS: { value: "" | Channel; label: string }[] = [
  { value: "", label: "أي قناة" },
  { value: "PUSH", label: "إشعار Push" },
  { value: "IN_APP", label: "داخل التطبيق" },
  { value: "SMS", label: "رسالة نصية" },
  { value: "EMAIL", label: "بريد إلكتروني" },
];

const LOCALES = ["ar", "en", "fr"];

const VAR_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function extractVars(text: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(VAR_RE);
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return Array.from(out);
}

function renderPreview(text: string, vars: Record<string, string>): string {
  return text.replace(
    new RegExp(VAR_RE),
    (_full, key: string) =>
      Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : "{{" + key + "}}",
  );
}

const EMPTY_FORM = {
  id: "",
  key: "",
  locale: "ar",
  name: "",
  description: "",
  category: "TRANSACTIONAL" as Category,
  channel: "" as "" | Channel,
  title: "",
  body: "",
  isActive: true,
  sortOrder: 0,
};

type FormState = typeof EMPTY_FORM;

export default function MessageTemplatesPage() {
  const { can } = useAuth();
  const canManage = can("notifications.send");
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [sampleVars, setSampleVars] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/message-templates", {
        params: { page, limit: 20 },
      });
      setRows(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
    } catch (error) {
      setMsg(getApiErrorMessage(error, "تعذّر تحميل قوالب الرسائل"));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const usedVars = useMemo(
    () => Array.from(new Set([...extractVars(form.title), ...extractVars(form.body)])),
    [form.title, form.body],
  );

  useEffect(() => {
    setSampleVars((current) => {
      const next: Record<string, string> = {};
      for (const v of usedVars) next[v] = current[v] ?? v;
      return next;
    });
  }, [usedVars]);

  function editRow(row: TemplateRow) {
    setForm({
      id: row.id,
      key: row.key,
      locale: row.locale,
      name: row.name,
      description: row.description ?? "",
      category: row.category,
      channel: row.channel ?? "",
      title: row.title,
      body: row.body,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    });
    setMsg("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setMsg("");
  }

  async function save() {
    if (!canManage) return;
    setMsg("");
    if (!form.key.trim() || !form.name.trim() || !form.title.trim() || !form.body.trim()) {
      setMsg("المفتاح والاسم والعنوان والنص مطلوبة");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        channel: form.channel || undefined,
        title: form.title,
        body: form.body,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (form.id) {
        await api.patch(`/message-templates/${form.id}`, payload);
        setMsg("تم تحديث القالب ✓");
      } else {
        await api.post("/message-templates", {
          ...payload,
          key: form.key.trim(),
          locale: form.locale,
        });
        setMsg("تم إنشاء القالب ✓");
      }
      resetForm();
      setPage(1);
      await load();
    } catch (error) {
      setMsg(getApiErrorMessage(error, "تعذّر حفظ القالب"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: TemplateRow) {
    if (!canManage) return;
    if (typeof window !== "undefined" && !window.confirm(`حذف القالب «${row.key}»؟`)) return;
    try {
      await api.delete(`/message-templates/${row.id}`);
      if (form.id === row.id) resetForm();
      await load();
    } catch (error) {
      setMsg(getApiErrorMessage(error, "تعذّر حذف القالب"));
    }
  }

  const categoryLabel = (c: string) =>
    CATEGORIES.find((x) => x.value === c)?.label ?? c;

  const columns: Column<TemplateRow>[] = [
    {
      key: "key",
      header: "القالب",
      render: (row) => (
        <div>
          <div className="font-semibold">{row.name}</div>
          <div className="text-xs text-gray-500">
            {row.key} · {row.locale}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "التصنيف",
      render: (row) => (
        <div className="text-xs">
          <div>{categoryLabel(row.category)}</div>
          <div className="text-gray-500">{row.channel ?? "أي قناة"}</div>
        </div>
      ),
    },
    {
      key: "title",
      header: "المحتوى",
      render: (row) => (
        <div className="max-w-80 text-sm">
          <div className="font-medium">{row.title}</div>
          <div className="truncate text-xs text-gray-500">{row.body}</div>
          {row.variables.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {row.variables.map((v) => (
                <span
                  key={v}
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                >
                  {v}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (row) => (
        <span
          className={
            row.isActive ? "text-emerald-600 text-xs" : "text-gray-400 text-xs"
          }
        >
          {row.isActive ? "مفعّل" : "معطّل"}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "آخر تحديث",
      render: (row) => (
        <div className="text-xs text-gray-500">{dateTime(row.updatedAt)}</div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex gap-2 text-xs">
          <button
            className="rounded border px-2 py-1 hover:bg-gray-50"
            onClick={() => editRow(row)}
          >
            تعديل
          </button>
          {canManage ? (
            <button
              className="rounded border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
              onClick={() => remove(row)}
            >
              حذف
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));
  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <>
      <Topbar title="قوالب الرسائل" />
      <div className="space-y-6 p-6">
        {msg ? (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
            {msg}
          </div>
        ) : null}

        {canManage ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold">
                {form.id ? "تعديل قالب" : "قالب جديد"}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-600">المفتاح (key)</label>
                <input
                  className={inputClass}
                  value={form.key}
                  disabled={Boolean(form.id)}
                  placeholder="trip.driver_assigned"
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">اللغة</label>
                <select
                  className={inputClass}
                  value={form.locale}
                  disabled={Boolean(form.id)}
                  onChange={(e) => setForm({ ...form, locale: e.target.value })}
                >
                  {LOCALES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">الاسم</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">التصنيف</label>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as Category })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">القناة</label>
                <select
                  className={inputClass}
                  value={form.channel}
                  onChange={(e) =>
                    setForm({ ...form, channel: e.target.value as "" | Channel })
                  }
                >
                  {CHANNELS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">الترتيب</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: Number(e.target.value) })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-gray-600">الوصف</label>
                <input
                  className={inputClass}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-gray-600">
                  العنوان (يدعم {"{{"}متغيّر{"}}"})
                </label>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-gray-600">النص</label>
                <textarea
                  className={inputClass}
                  rows={4}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
                مفعّل
              </label>
            </div>

            {usedVars.length > 0 ? (
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="mb-2 text-xs font-medium text-gray-600">
                  معاينة حية (قيم تجريبية)
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {usedVars.map((v) => (
                    <div key={v}>
                      <label className="mb-1 block text-[10px] text-gray-500">
                        {v}
                      </label>
                      <input
                        className={inputClass}
                        value={sampleVars[v] ?? ""}
                        onChange={(e) =>
                          setSampleVars({ ...sampleVars, [v]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-md border border-gray-200 bg-white p-3 text-sm">
                  <div className="font-semibold">
                    {renderPreview(form.title, sampleVars)}
                  </div>
                  <div className="whitespace-pre-wrap text-gray-700">
                    {renderPreview(form.body, sampleVars)}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                disabled={saving}
                onClick={save}
              >
                {form.id ? "حفظ التعديل" : "إنشاء القالب"}
              </button>
              {form.id ? (
                <button
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={resetForm}
                >
                  إلغاء
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-gray-200 bg-white">
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            empty="لا توجد قوالب بعد"
          />
          <div className="flex items-center justify-between border-t p-3 text-sm">
            <span className="text-gray-500">الإجمالي: {total}</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded border px-2 py-1 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                السابق
              </button>
              <span>
                {page} / {pages}
              </span>
              <button
                className="rounded border px-2 py-1 disabled:opacity-40"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                التالي
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
