"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArchiveRestore,
  Edit3,
  History,
  ListOrdered,
  Plus,
  Settings2,
  Table2,
  Trash2,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import {
  USAGE_TYPES,
  VehicleCategory,
  VehicleType,
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
import { Toggle } from "@/components/ui/Toggle";
import { FormRow, Labeled, inputCls } from "@/components/catalog/CatalogForm";

const SORT_OPTIONS = [
  { value: "name", label: "الاسم" },
  { value: "sortOrder", label: "الترتيب" },
  { value: "multiplier", label: "المعامل" },
  { value: "createdAt", label: "تاريخ الإنشاء" },
];

type Tab = "basic" | "options" | "requirements";

interface FormState {
  id?: string;
  categoryId: string;
  nameI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  usageType: string;
  multiplier: string;
  capacity: string;
  luggage: string;
  icon: IconValue;
  allowsNegotiation: boolean;
  supportsCash: boolean;
  supportsWallet: boolean;
  requiresApproval: boolean;
  visibleToPassengers: boolean;
  visibleToDrivers: boolean;
  minVehicleYear: string;
  minDriverRating: string;
  minDriverTrips: string;
  requiredLicenseType: string;
  requiredDocuments: string;
}

function emptyForm(categoryId = ""): FormState {
  return {
    categoryId,
    nameI18n: {},
    descriptionI18n: {},
    usageType: "RIDE",
    multiplier: "1",
    capacity: "4",
    luggage: "",
    icon: { iconType: "EMOJI", iconValue: "", color: "#4f46e5" },
    allowsNegotiation: false,
    supportsCash: true,
    supportsWallet: true,
    requiresApproval: false,
    visibleToPassengers: true,
    visibleToDrivers: true,
    minVehicleYear: "",
    minDriverRating: "",
    minDriverTrips: "",
    requiredLicenseType: "",
    requiredDocuments: "",
  };
}

function toForm(t: VehicleType): FormState {
  return {
    id: t.id,
    categoryId: t.categoryId ?? "",
    nameI18n: { ar: t.name, ...(t.nameI18n ?? {}) },
    descriptionI18n: {
      ...(t.description ? { ar: t.description } : {}),
      ...(t.descriptionI18n ?? {}),
    },
    usageType: t.usageType,
    multiplier: t.multiplier != null ? String(t.multiplier) : "1",
    capacity: t.capacity != null ? String(t.capacity) : "",
    luggage: t.luggage != null ? String(t.luggage) : "",
    icon: {
      iconType: t.iconType,
      iconValue: t.iconValue,
      iconUrl: t.iconUrl,
      imageUrl: t.imageUrl,
      color: t.color,
    },
    allowsNegotiation: !!t.allowsNegotiation,
    supportsCash: t.supportsCash !== false,
    supportsWallet: t.supportsWallet !== false,
    requiresApproval: !!t.requiresApproval,
    visibleToPassengers: t.visibleToPassengers !== false,
    visibleToDrivers: t.visibleToDrivers !== false,
    minVehicleYear: t.minVehicleYear != null ? String(t.minVehicleYear) : "",
    minDriverRating: t.minDriverRating != null ? String(t.minDriverRating) : "",
    minDriverTrips: t.minDriverTrips != null ? String(t.minDriverTrips) : "",
    requiredLicenseType: t.requiredLicenseType ?? "",
    requiredDocuments: (t.requiredDocuments ?? []).join(", "),
  };
}

function numOrUndef(v: string): number | undefined {
  const n = Number(v);
  return v.trim() === "" || Number.isNaN(n) ? undefined : n;
}

export default function VehicleTypesPage() {
  const { data, total, pages, loading, query, setQuery, reload } =
    useList<VehicleType>("/vehicle-types", { sortBy: "sortOrder" });
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [reorderMode, setReorderMode] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [tab, setTab] = useState<Tab>("basic");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [confirm, setConfirm] = useState<VehicleType | null>(null);
  const [auditFor, setAuditFor] = useState<VehicleType | null>(null);

  useEffect(() => {
    api
      .get("/vehicle-categories", { params: { limit: 100, sortBy: "sortOrder" } })
      .then((r) => setCategories(r.data.data ?? []))
      .catch(() => setCategories([]));
  }, []);

  function catName(id?: string | null) {
    const c = categories.find((x) => x.id === id);
    return c ? localized(c) : "—";
  }

  async function save() {
    if (!form) return;
    const ar = (form.nameI18n.ar || "").trim();
    if (!ar) {
      setTab("basic");
      return setSaveErr("الاسم بالعربية مطلوب");
    }
    setSaving(true);
    setSaveErr("");
    const body: Record<string, unknown> = {
      name: ar,
      nameI18n: form.nameI18n,
      categoryId: form.categoryId || undefined,
      description: form.descriptionI18n.ar || undefined,
      descriptionI18n: Object.keys(form.descriptionI18n).length
        ? form.descriptionI18n
        : undefined,
      usageType: form.usageType,
      multiplier: numOrUndef(form.multiplier),
      capacity: numOrUndef(form.capacity),
      luggage: numOrUndef(form.luggage),
      iconType: form.icon.iconType,
      iconValue: form.icon.iconValue || undefined,
      iconUrl: form.icon.iconUrl || undefined,
      imageUrl: form.icon.imageUrl || undefined,
      color: form.icon.color || undefined,
      allowsNegotiation: form.allowsNegotiation,
      supportsCash: form.supportsCash,
      supportsWallet: form.supportsWallet,
      requiresApproval: form.requiresApproval,
      visibleToPassengers: form.visibleToPassengers,
      visibleToDrivers: form.visibleToDrivers,
      minVehicleYear: numOrUndef(form.minVehicleYear),
      minDriverRating: numOrUndef(form.minDriverRating),
      minDriverTrips: numOrUndef(form.minDriverTrips),
      requiredLicenseType: form.requiredLicenseType.trim() || undefined,
      requiredDocuments: form.requiredDocuments.trim()
        ? form.requiredDocuments
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    };
    try {
      if (form.id) await api.patch(`/vehicle-types/${form.id}`, body);
      else await api.post("/vehicle-types", body);
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

  async function setStatus(t: VehicleType, status: WorkflowStatus) {
    await api.patch(`/vehicle-types/${t.id}/status`, { status });
    reload();
  }
  async function toggleActive(t: VehicleType) {
    await api.patch(`/vehicle-types/${t.id}/active`, { isActive: !t.isActive });
    reload();
  }
  async function restore(t: VehicleType) {
    await api.post(`/vehicle-types/${t.id}/restore`);
    reload();
  }
  async function reorder(orderedIds: string[]) {
    const items = orderedIds.map((id, i) => ({ id, sortOrder: i }));
    await api.patch("/vehicle-types/reorder", { items });
  }

  const openCreate = () => {
    setSaveErr("");
    setTab("basic");
    setForm(emptyForm(typeof query.categoryId === "string" ? query.categoryId : ""));
  };
  const openEdit = (t: VehicleType) => {
    setSaveErr("");
    setTab("basic");
    setForm(toForm(t));
  };

  return (
    <div>
      <Topbar title="أنواع المركبات" />
      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            أنواع المركبات داخل كل فئة. افتح التفاصيل لإدارة الحقول والميزات والتسعير.
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
              onClick={openCreate}
              className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              <Plus size={16} /> نوع جديد
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {reorderMode ? (
            <div className="p-4">
              <p className="mb-3 text-xs text-gray-400">اسحب الأنواع لتغيير ترتيبها.</p>
              <DragList
                items={data}
                onReorder={reorder}
                renderItem={(t) => (
                  <div className="flex items-center gap-3">
                    <IconPreview value={t} size={32} />
                    <span className="font-medium">{localized(t)}</span>
                    <span className="text-xs text-gray-400">{catName(t.categoryId)}</span>
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
                extra={
                  <select
                    value={typeof query.categoryId === "string" ? query.categoryId : ""}
                    onChange={(e) => setQuery({ categoryId: e.target.value })}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="">كل الفئات</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {localized(c)}
                      </option>
                    ))}
                  </select>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="border-b border-gray-200 text-xs text-gray-400 dark:border-gray-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">النوع</th>
                      <th className="px-4 py-3 font-medium">الفئة</th>
                      <th className="px-4 py-3 font-medium">المعامل</th>
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
                          لا توجد أنواع.
                        </td>
                      </tr>
                    ) : (
                      data.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b border-gray-100 last:border-0 dark:border-gray-800/60"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <IconPreview value={t} size={34} />
                              <div>
                                <div className="font-medium">{localized(t)}</div>
                                <div className="text-[11px] text-gray-400">
                                  {t.capacity ? `${t.capacity} مقاعد` : ""}
                                  {t.deletedAt ? " · مؤرشف" : ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{catName(t.categoryId)}</td>
                          <td className="px-4 py-3 text-gray-500">×{t.multiplier ?? 1}</td>
                          <td className="px-4 py-3">
                            <StatusControl status={t.status} onChange={(s) => setStatus(t, s)} />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleActive(t)}
                              className={t.isActive ? "text-green-600" : "text-gray-400"}
                            >
                              {t.isActive ? "مفعّل" : "موقوف"}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Link
                                href={`/catalog/vehicle-types/${t.id}`}
                                title="التفاصيل (حقول/ميزات/تسعير)"
                                className="hover:text-brand"
                              >
                                <Settings2 size={16} />
                              </Link>
                              <button title="تعديل" onClick={() => openEdit(t)} className="hover:text-brand">
                                <Edit3 size={16} />
                              </button>
                              <button
                                title="سجل التعديلات"
                                onClick={() => setAuditFor(t)}
                                className="hover:text-brand"
                              >
                                <History size={16} />
                              </button>
                              {t.deletedAt ? (
                                <button
                                  title="استعادة"
                                  onClick={() => restore(t)}
                                  className="hover:text-green-600"
                                >
                                  <ArchiveRestore size={16} />
                                </button>
                              ) : (
                                <button
                                  title="أرشفة"
                                  onClick={() => setConfirm(t)}
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

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "تعديل نوع" : "نوع جديد"}
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
          <div>
            <div className="mb-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
              {([
                ["basic", "أساسي"],
                ["options", "الخيارات"],
                ["requirements", "المتطلبات"],
              ] as [Tab, string][]).map(([t, l]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={
                    tab === t
                      ? "border-b-2 border-brand px-4 py-2 text-sm font-medium text-brand"
                      : "px-4 py-2 text-sm text-gray-500"
                  }
                >
                  {l}
                </button>
              ))}
            </div>

            {tab === "basic" ? (
              <div className="space-y-4">
                <Labeled label="الفئة">
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">بدون فئة</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {localized(c)}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <I18nField
                  label="اسم النوع"
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
                  <Labeled label="معامل السعر (multiplier)">
                    <input
                      value={form.multiplier}
                      onChange={(e) => setForm({ ...form, multiplier: e.target.value })}
                      className={inputCls}
                      dir="ltr"
                      inputMode="decimal"
                    />
                  </Labeled>
                </FormRow>
                <FormRow>
                  <Labeled label="عدد المقاعد">
                    <input
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      className={inputCls}
                      dir="ltr"
                      inputMode="numeric"
                    />
                  </Labeled>
                  <Labeled label="الأمتعة">
                    <input
                      value={form.luggage}
                      onChange={(e) => setForm({ ...form, luggage: e.target.value })}
                      className={inputCls}
                      dir="ltr"
                      inputMode="numeric"
                    />
                  </Labeled>
                </FormRow>
                <div>
                  <span className="mb-2 block text-sm font-medium">الأيقونة والصورة</span>
                  <IconField value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} />
                </div>
              </div>
            ) : null}

            {tab === "options" ? (
              <div className="space-y-3">
                <Toggle
                  checked={form.visibleToPassengers}
                  onChange={(v) => setForm({ ...form, visibleToPassengers: v })}
                  label="مرئي للركاب"
                />
                <Toggle
                  checked={form.visibleToDrivers}
                  onChange={(v) => setForm({ ...form, visibleToDrivers: v })}
                  label="مرئي للسائقين"
                />
                <Toggle
                  checked={form.supportsCash}
                  onChange={(v) => setForm({ ...form, supportsCash: v })}
                  label="يدعم الدفع نقدًا"
                />
                <Toggle
                  checked={form.supportsWallet}
                  onChange={(v) => setForm({ ...form, supportsWallet: v })}
                  label="يدعم المحفظة"
                />
                <Toggle
                  checked={form.allowsNegotiation}
                  onChange={(v) => setForm({ ...form, allowsNegotiation: v })}
                  label="يسمح بالتفاوض على السعر"
                />
                <Toggle
                  checked={form.requiresApproval}
                  onChange={(v) => setForm({ ...form, requiresApproval: v })}
                  label="يتطلب موافقة يدوية للسائق"
                />
              </div>
            ) : null}

            {tab === "requirements" ? (
              <div className="space-y-4">
                <p className="text-xs text-gray-400">
                  هذه الشروط تُتحقق تلقائيًا عند ربط السائق بالنوع.
                </p>
                <FormRow>
                  <Labeled label="أقدم سنة صنع مسموحة">
                    <input
                      value={form.minVehicleYear}
                      onChange={(e) => setForm({ ...form, minVehicleYear: e.target.value })}
                      className={inputCls}
                      dir="ltr"
                      inputMode="numeric"
                    />
                  </Labeled>
                  <Labeled label="أدنى عدد رحلات للسائق">
                    <input
                      value={form.minDriverTrips}
                      onChange={(e) => setForm({ ...form, minDriverTrips: e.target.value })}
                      className={inputCls}
                      dir="ltr"
                      inputMode="numeric"
                    />
                  </Labeled>
                </FormRow>
                <FormRow>
                  <Labeled label="أدنى تقييم للسائق">
                    <input
                      value={form.minDriverRating}
                      onChange={(e) => setForm({ ...form, minDriverRating: e.target.value })}
                      className={inputCls}
                      dir="ltr"
                      inputMode="decimal"
                    />
                  </Labeled>
                  <Labeled label="نوع الرخصة المطلوبة">
                    <input
                      value={form.requiredLicenseType}
                      onChange={(e) => setForm({ ...form, requiredLicenseType: e.target.value })}
                      className={inputCls}
                    />
                  </Labeled>
                </FormRow>
                <Labeled
                  label="المستندات المطلوبة"
                  hint="افصل بين القيم بفاصلة (مثال: LICENSE, INSURANCE)"
                >
                  <input
                    value={form.requiredDocuments}
                    onChange={(e) => setForm({ ...form, requiredDocuments: e.target.value })}
                    className={inputCls}
                    dir="ltr"
                  />
                </Labeled>
              </div>
            ) : null}

            {saveErr ? <p className="mt-4 text-sm text-red-500">{saveErr}</p> : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        tone="danger"
        title="أرشفة النوع"
        message={
          confirm ? (
            <>
              ستتم أرشفة <b>{localized(confirm)}</b>. لن تتأثر الرحلات القديمة،
              ويمكن استعادته لاحقًا.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="أرشفة"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm) {
            await api.delete(`/vehicle-types/${confirm.id}`);
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
        {auditFor ? <AuditLog entity="VehicleType" entityId={auditFor.id} /> : null}
      </Modal>
    </div>
  );
}
