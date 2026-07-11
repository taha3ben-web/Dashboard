"use client";

import { useState } from "react";
import { ArchiveRestore, Edit3, History, Plus, Trash2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import { Feature, localized } from "@/lib/catalog";
import { useList } from "@/hooks/useList";
import { TableToolbar } from "@/components/catalog/TableToolbar";
import { Pagination } from "@/components/catalog/Pagination";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AuditLog } from "@/components/catalog/AuditLog";
import { I18nField } from "@/components/catalog/I18nField";
import { IconField, IconPreview, IconValue } from "@/components/catalog/IconField";
import { Labeled, inputCls } from "@/components/catalog/CatalogForm";

const SORT_OPTIONS = [
  { value: "name", label: "الاسم" },
  { value: "sortOrder", label: "الترتيب" },
  { value: "createdAt", label: "تاريخ الإنشاء" },
];

interface FormState {
  id?: string;
  code: string;
  nameI18n: Record<string, string>;
  icon: IconValue;
}

function emptyForm(): FormState {
  return {
    code: "",
    nameI18n: {},
    icon: { iconType: "EMOJI", iconValue: "", color: "#4f46e5" },
  };
}

function toForm(f: Feature): FormState {
  return {
    id: f.id,
    code: f.code,
    nameI18n: { ar: f.name, ...(f.nameI18n ?? {}) },
    icon: {
      iconType: f.iconType,
      iconValue: f.iconValue,
      iconUrl: f.iconUrl,
      color: null,
    },
  };
}

export default function FeaturesPage() {
  const { data, total, pages, loading, query, setQuery, reload } =
    useList<Feature>("/features", { sortBy: "sortOrder" });
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [confirm, setConfirm] = useState<Feature | null>(null);
  const [auditFor, setAuditFor] = useState<Feature | null>(null);

  async function save() {
    if (!form) return;
    const ar = (form.nameI18n.ar || "").trim();
    if (!form.code.trim()) return setSaveErr("الرمز (code) مطلوب");
    if (!ar) return setSaveErr("الاسم بالعربية مطلوب");
    setSaving(true);
    setSaveErr("");
    const body = {
      code: form.code.trim(),
      name: ar,
      nameI18n: form.nameI18n,
      iconType: form.icon.iconType,
      iconValue: form.icon.iconValue || undefined,
      iconUrl: form.icon.iconUrl || undefined,
    };
    try {
      if (form.id) await api.patch(`/features/${form.id}`, body);
      else await api.post("/features", body);
      setForm(null);
      reload();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? "تعذّر الحفظ";
      setSaveErr(Array.isArray(msg) ? msg.join("، ") : String(msg));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(f: Feature) {
    await api.patch(`/features/${f.id}/active`, { isActive: !f.isActive });
    reload();
  }
  async function restore(f: Feature) {
    await api.post(`/features/${f.id}/restore`);
    reload();
  }

  return (
    <div>
      <Topbar title="ميزات المركبات" />
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            الميزات (مكيّف هواء، واي فاي، مقاعد أطفال...) تُربط بأنواع المركبات.
          </p>
          <button
            onClick={() => {
              setSaveErr("");
              setForm(emptyForm());
            }}
            className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            <Plus size={16} /> ميزة جديدة
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <TableToolbar
            search={query.search}
            onSearch={(v) => setQuery({ search: v })}
            sortBy={query.sortBy}
            sortOrder={query.sortOrder}
            onSort={(by, order) => setQuery({ sortBy: by, sortOrder: order })}
            sortOptions={SORT_OPTIONS}
            showStatus={false}
            activeOnly={query.activeOnly}
            onActiveOnly={(v) => setQuery({ activeOnly: v })}
            includeDeleted={query.includeDeleted}
            onIncludeDeleted={(v) => setQuery({ includeDeleted: v })}
            onReload={reload}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-400 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3 font-medium">الميزة</th>
                  <th className="px-4 py-3 font-medium">الرمز</th>
                  <th className="px-4 py-3 font-medium">نشط</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-400">
                      جارٍ التحميل...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-400">
                      لا توجد ميزات.
                    </td>
                  </tr>
                ) : (
                  data.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <IconPreview value={f} size={30} />
                          <span className="font-medium">{localized(f)}</span>
                          {f.deletedAt ? (
                            <span className="text-[11px] text-red-500">مؤرشفة</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                          {f.code}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(f)}
                          className={f.isActive ? "text-green-600" : "text-gray-400"}
                        >
                          {f.isActive ? "مفعّل" : "موقوف"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-400">
                          <button
                            title="تعديل"
                            onClick={() => {
                              setSaveErr("");
                              setForm(toForm(f));
                            }}
                            className="hover:text-brand"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            title="سجل التعديلات"
                            onClick={() => setAuditFor(f)}
                            className="hover:text-brand"
                          >
                            <History size={16} />
                          </button>
                          {f.deletedAt ? (
                            <button
                              title="استعادة"
                              onClick={() => restore(f)}
                              className="hover:text-green-600"
                            >
                              <ArchiveRestore size={16} />
                            </button>
                          ) : (
                            <button
                              title="أرشفة"
                              onClick={() => setConfirm(f)}
                              className="hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={query.page}
            pages={pages}
            total={total}
            limit={query.limit}
            onPage={(p) => setQuery({ page: p })}
            onLimit={(l) => setQuery({ limit: l })}
          />
        </div>
      </div>

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "تعديل ميزة" : "ميزة جديدة"}
        footer={
          <>
            <button
              onClick={() => setForm(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        {form ? (
          <div className="space-y-4">
            <Labeled label="الرمز (code)" hint="معرّف ثابت بالإنجليزية مثل AC أو WIFI">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className={inputCls}
                dir="ltr"
              />
            </Labeled>
            <I18nField
              label="اسم الميزة"
              value={form.nameI18n}
              onChange={(v) => setForm({ ...form, nameI18n: v })}
              required
            />
            <div>
              <span className="mb-2 block text-sm font-medium">الأيقونة</span>
              <IconField
                value={form.icon}
                onChange={(v) => setForm({ ...form, icon: v })}
                showImage={false}
              />
            </div>
            {saveErr ? <p className="text-sm text-red-500">{saveErr}</p> : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        tone="danger"
        title="أرشفة الميزة"
        message={
          confirm ? (
            <>ستتم أرشفة <b>{localized(confirm)}</b>. يمكن استعادتها لاحقًا.</>
          ) : (
            ""
          )
        }
        confirmLabel="أرشفة"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm) {
            await api.delete(`/features/${confirm.id}`);
            setConfirm(null);
            reload();
          }
        }}
      />

      <Modal
        open={auditFor !== null}
        onClose={() => setAuditFor(null)}
        title={`سجل التعديلات — ${auditFor ? localized(auditFor) : ""}`}
      >
        {auditFor ? <AuditLog entity="Feature" entityId={auditFor.id} /> : null}
      </Modal>
    </div>
  );
}
