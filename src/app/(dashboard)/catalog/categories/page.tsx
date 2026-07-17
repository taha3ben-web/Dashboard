"use client";

import { useState } from "react";
import {
  ArchiveRestore,
  Edit3,
  History,
  ListOrdered,
  Plus,
  Table2,
  Trash2,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api, getApiErrorMessage } from "@/lib/api";
import {
  CATALOG_DOMAINS,
  USAGE_TYPES,
  VehicleCategory,
  WorkflowStatus,
  localized,
} from "@/lib/catalog";
import { useList } from "@/hooks/useList";
import { TableToolbar } from "@/components/catalog/TableToolbar";
import { Pagination } from "@/components/catalog/Pagination";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusControl } from "@/components/catalog/StatusControl";
import { AuditLog } from "@/components/catalog/AuditLog";
import { DragList } from "@/components/catalog/DragList";
import { I18nField } from "@/components/catalog/I18nField";
import { IconField, IconPreview, IconValue } from "@/components/catalog/IconField";
import { FormRow, Labeled, inputCls } from "@/components/catalog/CatalogForm";

const SORT_OPTIONS = [
  { value: "name", label: "الاسم" },
  { value: "sortOrder", label: "الترتيب" },
  { value: "createdAt", label: "تاريخ الإنشاء" },
  { value: "updatedAt", label: "آخر تحديث" },
];

interface FormState {
  id?: string;
  nameI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  usageType: string;
  domain: string;
  icon: IconValue;
}

function emptyForm(): FormState {
  return {
    nameI18n: {},
    descriptionI18n: {},
    usageType: "RIDE",
    domain: "MOBILITY",
    icon: { iconType: "PNG", imageUrl: "", color: "#4f46e5" },
  };
}

function toForm(c: VehicleCategory): FormState {
  return {
    id: c.id,
    nameI18n: { ar: c.name, ...(c.nameI18n ?? {}) },
    descriptionI18n: {
      ...(c.description ? { ar: c.description } : {}),
      ...(c.descriptionI18n ?? {}),
    },
    usageType: c.usageType,
    domain: c.domain,
    icon: {
      iconType: c.iconType,
      iconValue: c.iconValue,
      iconUrl: c.iconUrl,
      imageUrl: c.imageUrl,
      color: c.color,
    },
  };
}

export default function CategoriesPage() {
  const { data, total, pages, loading, query, setQuery, reload } =
    useList<VehicleCategory>("/vehicle-categories", { sortBy: "sortOrder" });

  const [reorderMode, setReorderMode] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [confirm, setConfirm] = useState<VehicleCategory | null>(null);
  const [auditFor, setAuditFor] = useState<VehicleCategory | null>(null);

  async function save() {
    if (!form) return;
    const ar = (form.nameI18n.ar || "").trim();
    if (!ar) {
      setSaveErr("الاسم بالعربية مطلوب");
      return;
    }
    setSaving(true);
    setSaveErr("");
    const body = {
      name: ar,
      nameI18n: form.nameI18n,
      description: form.descriptionI18n.ar || undefined,
      descriptionI18n: Object.keys(form.descriptionI18n).length
        ? form.descriptionI18n
        : undefined,
      usageType: form.usageType,
      domain: form.domain,
      iconType: "PNG",
      imageUrl: form.icon.imageUrl || undefined,
      color: form.icon.color || undefined,
      status: form.id ? undefined : "PUBLISHED",
      isActive: true,
    };
    try {
      if (form.id) await api.patch(`/vehicle-categories/${form.id}`, body);
      else await api.post("/vehicle-categories", body);
      setForm(null);
      reload();
    } catch (e: unknown) {
      setSaveErr(getApiErrorMessage(e, "تعذّر حفظ الفئة"));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(c: VehicleCategory, status: WorkflowStatus) {
    await api.patch(`/vehicle-categories/${c.id}/status`, { status });
    reload();
  }
  async function toggleActive(c: VehicleCategory) {
    await api.patch(`/vehicle-categories/${c.id}/active`, {
      isActive: !c.isActive,
    });
    reload();
  }
  async function restore(c: VehicleCategory) {
    await api.post(`/vehicle-categories/${c.id}/restore`);
    reload();
  }
  async function reorder(orderedIds: string[]) {
    const items = orderedIds.map((id, i) => ({ id, sortOrder: i }));
    await api.patch("/vehicle-categories/reorder", { items });
  }

  return (
    <div>
      <Topbar title="فئات المركبات" />
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            أنشئ ورتّب فئات المركبات. التغييرات تنعكس فورًا على التطبيقات بعد النشر.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setReorderMode((v) => !v)}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
            >
              {reorderMode ? <Table2 size={16} /> : <ListOrdered size={16} />}
              {reorderMode ? "عرض الجدول" : "ترتيب بالسحب"}
            </button>
            <button
              onClick={() => {
                setSaveErr("");
                setForm(emptyForm());
              }}
              className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              <Plus size={16} /> فئة جديدة
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {reorderMode ? (
            <div className="p-4">
              <p className="mb-3 text-xs text-gray-400">
                اسحب العناصر لتغيير ترتيبها. يُحفظ الترتيب تلقائيًا.
              </p>
              <DragList
                items={data}
                onReorder={reorder}
                renderItem={(c) => (
                  <div className="flex items-center gap-3">
                    <IconPreview value={c} size={32} />
                    <span className="font-medium">{localized(c)}</span>
                    <span className="text-xs text-gray-400">
                      {c._count?.types ?? 0} نوع
                    </span>
                  </div>
                )}
              />
            </div>
          ) : (
            <>
              <TableToolbar
                search={query.search}
                onSearch={(v) => setQuery({ search: v })}
                sortBy={query.sortBy}
                sortOrder={query.sortOrder}
                onSort={(by, order) => setQuery({ sortBy: by, sortOrder: order })}
                sortOptions={SORT_OPTIONS}
                status={query.status}
                onStatus={(v) => setQuery({ status: v })}
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
                      <th className="px-4 py-3 font-medium">الفئة</th>
                      <th className="px-4 py-3 font-medium">الاستخدام</th>
                      <th className="px-4 py-3 font-medium">الأنواع</th>
                      <th className="px-4 py-3 font-medium">الحالة</th>
                      <th className="px-4 py-3 font-medium">نشط</th>
                      <th className="px-4 py-3 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">
                          جارٍ التحميل...
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">
                          لا توجد فئات.
                        </td>
                      </tr>
                    ) : (
                      data.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-gray-100 last:border-0 dark:border-gray-800/60"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <IconPreview value={c} size={34} />
                              <div>
                                <div className="font-medium">{localized(c)}</div>
                                {c.deletedAt ? (
                                  <span className="text-[11px] text-red-500">مؤرشفة</span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {USAGE_TYPES.find((u) => u.value === c.usageType)?.label ??
                              c.usageType}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {c._count?.types ?? 0}
                          </td>
                          <td className="px-4 py-3">
                            <StatusControl
                              status={c.status}
                              onChange={(s) => setStatus(c, s)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleActive(c)}
                              className={
                                c.isActive
                                  ? "text-green-600"
                                  : "text-gray-400"
                              }
                            >
                              {c.isActive ? "مفعّل" : "موقوف"}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-gray-400">
                              <button
                                title="تعديل"
                                onClick={() => {
                                  setSaveErr("");
                                  setForm(toForm(c));
                                }}
                                className="hover:text-brand"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                title="سجل التعديلات"
                                onClick={() => setAuditFor(c)}
                                className="hover:text-brand"
                              >
                                <History size={16} />
                              </button>
                              {c.deletedAt ? (
                                <button
                                  title="استعادة"
                                  onClick={() => restore(c)}
                                  className="hover:text-green-600"
                                >
                                  <ArchiveRestore size={16} />
                                </button>
                              ) : (
                                <button
                                  title="أرشفة"
                                  onClick={() => setConfirm(c)}
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
            </>
          )}
        </div>
      </div>

      {/* نموذج الإنشاء/التعديل */}
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "تعديل فئة" : "فئة جديدة"}
        size="lg"
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
            <I18nField
              label="اسم الفئة"
              value={form.nameI18n}
              onChange={(v) => setForm({ ...form, nameI18n: v })}
              required
            />
            <I18nField
              label="الوصف"
              value={form.descriptionI18n}
              onChange={(v) => setForm({ ...form, descriptionI18n: v })}
              textarea
            />
            <FormRow>
              <Labeled label="غرض الاستخدام">
                <select
                  value={form.usageType}
                  onChange={(e) => setForm({ ...form, usageType: e.target.value })}
                  className={inputCls}
                >
                  {USAGE_TYPES.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label="المجال">
                <select
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className={inputCls}
                >
                  {CATALOG_DOMAINS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Labeled>
            </FormRow>
            <div>
              <span className="mb-2 block text-sm font-medium">الأيقونة والصورة</span>
              <IconField
                value={form.icon}
                onChange={(v) => setForm({ ...form, icon: v })}
              />
            </div>
            {saveErr ? <p className="text-sm text-red-500">{saveErr}</p> : null}
          </div>
        ) : null}
      </Modal>

      {/* تأكيد الأرشفة */}
      <ConfirmDialog
        open={confirm !== null}
        tone="danger"
        title="أرشفة الفئة"
        message={
          confirm ? (
            <>
              ستتم أرشفة <b>{localized(confirm)}</b>. لن تُحذف نهائيًا ويمكن
              استعادتها لاحقًا. إذا كانت تحتوي أنواعًا نشطة فلن يُسمح بذلك.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="أرشفة"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm) {
            await api.delete(`/vehicle-categories/${confirm.id}`);
            setConfirm(null);
            reload();
          }
        }}
      />

      {/* سجل التعديلات */}
      <Modal
        open={auditFor !== null}
        onClose={() => setAuditFor(null)}
        title={`سجل التعديلات — ${auditFor ? localized(auditFor) : ""}`}
        size="md"
      >
        {auditFor ? (
          <AuditLog entity="VehicleCategory" entityId={auditFor.id} />
        ) : null}
      </Modal>
    </div>
  );
}
