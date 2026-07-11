"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Edit3,
  Plus,
  Trash2,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import {
  FIELD_TYPES,
  Feature,
  VehicleField,
  VehicleType,
  localized,
} from "@/lib/catalog";
import { money } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toggle } from "@/components/ui/Toggle";
import { WorkflowBadge } from "@/components/catalog/WorkflowBadge";
import { I18nField } from "@/components/catalog/I18nField";
import { IconPreview } from "@/components/catalog/IconField";
import { Labeled, inputCls } from "@/components/catalog/CatalogForm";

interface FieldForm {
  id?: string;
  key: string;
  labelI18n: Record<string, string>;
  fieldType: string;
  options: string;
  required: boolean;
}

function emptyField(): FieldForm {
  return { key: "", labelI18n: {}, fieldType: "TEXT", options: "", required: false };
}

export default function VehicleTypeDetailPage() {
  const params = useParams();
  const id = String(params.id);

  const [type, setType] = useState<VehicleType | null>(null);
  const [fields, setFields] = useState<VehicleField[]>([]);
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [fieldForm, setFieldForm] = useState<FieldForm | null>(null);
  const [savingField, setSavingField] = useState(false);
  const [fieldErr, setFieldErr] = useState("");
  const [delField, setDelField] = useState<VehicleField | null>(null);
  const [savingFeatures, setSavingFeatures] = useState(false);

  const loadType = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<VehicleType>(`/vehicle-types/${id}`),
      api.get<VehicleField[]>(`/vehicle-types/${id}/fields`),
      api.get(`/features`, { params: { limit: 100, activeOnly: "true" } }),
    ])
      .then(([t, f, feats]) => {
        setType(t.data);
        setFields(Array.isArray(f.data) ? f.data : []);
        setSelectedFeatures((t.data.features ?? []).map((x) => x.feature.id));
        setAllFeatures(feats.data.data ?? []);
      })
      .catch(() => setType(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadType();
  }, [loadType]);

  async function saveField() {
    if (!fieldForm) return;
    const ar = (fieldForm.labelI18n.ar || "").trim();
    if (!fieldForm.key.trim()) return setFieldErr("المفتاح (key) مطلوب");
    if (!ar) return setFieldErr("العنوان بالعربية مطلوب");
    setSavingField(true);
    setFieldErr("");
    const needsOptions =
      fieldForm.fieldType === "SELECT" || fieldForm.fieldType === "MULTISELECT";
    const body: Record<string, unknown> = {
      key: fieldForm.key.trim(),
      label: ar,
      labelI18n: fieldForm.labelI18n,
      fieldType: fieldForm.fieldType,
      required: fieldForm.required,
      options: needsOptions
        ? fieldForm.options
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    };
    try {
      if (fieldForm.id)
        await api.patch(`/vehicle-types/fields/${fieldForm.id}`, body);
      else await api.post(`/vehicle-types/${id}/fields`, body);
      setFieldForm(null);
      loadType();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? "تعذّر الحفظ";
      setFieldErr(Array.isArray(msg) ? msg.join("، ") : String(msg));
    } finally {
      setSavingField(false);
    }
  }

  async function saveFeatures() {
    setSavingFeatures(true);
    try {
      await api.patch(`/vehicle-types/${id}`, { featureIds: selectedFeatures });
      loadType();
    } finally {
      setSavingFeatures(false);
    }
  }

  function toggleFeature(fid: string) {
    setSelectedFeatures((prev) =>
      prev.includes(fid) ? prev.filter((x) => x !== fid) : [...prev, fid],
    );
  }

  if (loading)
    return (
      <div>
        <Topbar title="تفاصيل النوع" />
        <p className="p-10 text-center text-gray-400">جارٍ التحميل...</p>
      </div>
    );

  if (!type)
    return (
      <div>
        <Topbar title="تفاصيل النوع" />
        <p className="p-10 text-center text-gray-400">النوع غير موجود.</p>
      </div>
    );

  return (
    <div>
      <Topbar title="تفاصيل النوع" />
      <div className="space-y-4 p-4">
        <Link
          href="/catalog/vehicle-types"
          className="inline-flex items-center gap-1 text-sm text-brand"
        >
          <ArrowRight size={16} /> العودة للأنواع
        </Link>

        {/* رأس النوع */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <IconPreview value={type} size={52} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{localized(type)}</h2>
              <WorkflowBadge status={type.status} />
            </div>
            <p className="text-sm text-gray-500">
              المعامل ×{type.multiplier ?? 1} · {type.capacity ?? "—"} مقاعد
            </p>
          </div>
        </div>

        {/* الميزات */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">الميزات المرتبطة</h3>
            <button
              onClick={saveFeatures}
              disabled={savingFeatures}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {savingFeatures ? "جارٍ الحفظ..." : "حفظ الميزات"}
            </button>
          </div>
          {allFeatures.length === 0 ? (
            <p className="text-sm text-gray-400">
              لا توجد ميزات. أضفها من{" "}
              <Link href="/catalog/features" className="text-brand">
                صفحة الميزات
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allFeatures.map((f) => {
                const on = selectedFeatures.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFeature(f.id)}
                    className={
                      on
                        ? "rounded-full bg-brand px-3 py-1.5 text-sm text-white"
                        : "rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    }
                  >
                    {localized(f)}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* الحقول الديناميكية */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold">الحقول الديناميكية</h3>
              <p className="text-xs text-gray-400">
                حقول مخصصة لهذا النوع دون الحاجة لتعديل التطبيق.
              </p>
            </div>
            <button
              onClick={() => {
                setFieldErr("");
                setFieldForm(emptyField());
              }}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
            >
              <Plus size={16} /> حقل جديد
            </button>
          </div>
          {fields.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد حقول مخصصة.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {fields.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium">{localized({ name: f.label, nameI18n: f.labelI18n })}</span>
                    <span className="mr-2 text-xs text-gray-400">
                      {FIELD_TYPES.find((t) => t.value === f.fieldType)?.label}
                      {f.required ? " · إلزامي" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <button
                      onClick={() => {
                        setFieldErr("");
                        setFieldForm({
                          id: f.id,
                          key: f.key,
                          labelI18n: { ar: f.label, ...(f.labelI18n ?? {}) },
                          fieldType: f.fieldType,
                          options: Array.isArray(f.options)
                            ? (f.options as string[]).join(", ")
                            : "",
                          required: f.required,
                        });
                      }}
                      className="hover:text-brand"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => setDelField(f)} className="hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* التسعير */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">قواعد التسعير</h3>
            <Link
              href={`/catalog/pricing?vehicleTypeId=${id}`}
              className="text-sm text-brand"
            >
              إدارة التسعير ←
            </Link>
          </div>
          {type.pricingRules && type.pricingRules.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {type.pricingRules.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.name || "قاعدة"}</span>
                  <span className="text-gray-500">
                    أساسي {money(Number(p.baseFare))} · /كم {money(Number(p.perKm))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">
              لا توجد قواعد تسعير لهذا النوع بعد.
            </p>
          )}
        </section>
      </div>

      {/* نموذج الحقل */}
      <Modal
        open={fieldForm !== null}
        onClose={() => setFieldForm(null)}
        title={fieldForm?.id ? "تعديل حقل" : "حقل جديد"}
        footer={
          <>
            <button
              onClick={() => setFieldForm(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={saveField}
              disabled={savingField}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {savingField ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        {fieldForm ? (
          <div className="space-y-4">
            <Labeled label="المفتاح (key)" hint="معرّف بالإنجليزية مثل plate_color">
              <input
                value={fieldForm.key}
                onChange={(e) => setFieldForm({ ...fieldForm, key: e.target.value })}
                className={inputCls}
                dir="ltr"
              />
            </Labeled>
            <I18nField
              label="عنوان الحقل"
              value={fieldForm.labelI18n}
              onChange={(v) => setFieldForm({ ...fieldForm, labelI18n: v })}
              required
            />
            <Labeled label="نوع الحقل">
              <select
                value={fieldForm.fieldType}
                onChange={(e) => setFieldForm({ ...fieldForm, fieldType: e.target.value })}
                className={inputCls}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Labeled>
            {fieldForm.fieldType === "SELECT" ||
            fieldForm.fieldType === "MULTISELECT" ? (
              <Labeled label="الخيارات" hint="افصل بين الخيارات بفاصلة">
                <input
                  value={fieldForm.options}
                  onChange={(e) => setFieldForm({ ...fieldForm, options: e.target.value })}
                  className={inputCls}
                />
              </Labeled>
            ) : null}
            <Toggle
              checked={fieldForm.required}
              onChange={(v) => setFieldForm({ ...fieldForm, required: v })}
              label="حقل إلزامي"
            />
            {fieldErr ? <p className="text-sm text-red-500">{fieldErr}</p> : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={delField !== null}
        tone="danger"
        title="حذف الحقل"
        message={
          delField ? (
            <>سيتم حذف الحقل <b>{delField.label}</b> من هذا النوع.</>
          ) : (
            ""
          )
        }
        confirmLabel="حذف"
        onCancel={() => setDelField(null)}
        onConfirm={async () => {
          if (delField) {
            await api.delete(`/vehicle-types/fields/${delField.id}`);
            setDelField(null);
            loadType();
          }
        }}
      />
    </div>
  );
}
