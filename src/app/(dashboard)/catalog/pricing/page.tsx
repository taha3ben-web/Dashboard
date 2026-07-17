"use client";

import { useEffect, useState } from "react";
import { ArchiveRestore, Edit3, History, Plus, Trash2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import {
  PricingRule,
  ServiceArea,
  VehicleType,
  localized,
} from "@/lib/catalog";
import { money } from "@/lib/format";
import { useList } from "@/hooks/useList";
import { TableToolbar } from "@/components/catalog/TableToolbar";
import { Pagination } from "@/components/catalog/Pagination";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AuditLog } from "@/components/catalog/AuditLog";
import { Toggle } from "@/components/ui/Toggle";
import { FormRow, Labeled, inputCls } from "@/components/catalog/CatalogForm";

const SORT_OPTIONS = [
  { value: "priority", label: "الأولوية" },
  { value: "baseFare", label: "الأجرة الأساسية" },
  { value: "createdAt", label: "تاريخ الإنشاء" },
];

const CUSTOMER_TYPES = [
  { value: "", label: "الجميع" },
  { value: "NORMAL", label: "عادي" },
  { value: "VIP", label: "VIP" },
  { value: "CORPORATE", label: "شركات" },
];

interface FormState {
  id?: string;
  vehicleTypeId: string;
  name: string;
  serviceAreaId: string;
  cityId: string;
  state: string;
  country: string;
  customerType: string;
  couponCode: string;
  appIdsText: string;
  clientOsText: string;
  audienceSegmentsText: string;
  minAppVersion: string;
  maxAppVersion: string;
  validFrom: string;
  validTo: string;
  daysOfWeek: string;
  baseFare: string;
  perKm: string;
  perMin: string;
  minFare: string;
  maxFare: string;
  negotiationMin: string;
  negotiationMax: string;
  peakMultiplier: string;
  commissionPct: string;
  currency: string;
  priority: string;
  startTime: string;
  endTime: string;
  metadataJson: string;
}

function emptyForm(vehicleTypeId = ""): FormState {
  return {
    vehicleTypeId,
    name: "",
    serviceAreaId: "",
    cityId: "",
    state: "",
    country: "",
    customerType: "",
    couponCode: "",
    appIdsText: "",
    clientOsText: "",
    audienceSegmentsText: "",
    minAppVersion: "",
    maxAppVersion: "",
    validFrom: "",
    validTo: "",
    daysOfWeek: "",
    baseFare: "",
    perKm: "",
    perMin: "",
    minFare: "",
    maxFare: "",
    negotiationMin: "",
    negotiationMax: "",
    peakMultiplier: "",
    commissionPct: "",
    currency: "DZD",
    priority: "0",
    startTime: "",
    endTime: "",
    metadataJson: "",
  };
}

function toForm(p: PricingRule): FormState {
  const s = (v: unknown) => (v == null ? "" : String(v));
  return {
    id: p.id,
    vehicleTypeId: p.vehicleTypeId,
    name: p.name ?? "",
    serviceAreaId: p.serviceAreaId ?? "",
    cityId: p.cityId ?? "",
    state: (p as PricingRule & { state?: string | null }).state ?? "",
    country: (p as PricingRule & { country?: string | null }).country ?? "",
    customerType: p.customerType ?? "",
    couponCode: p.couponCode ?? "",
    appIdsText: (p.appIds ?? []).join(", "),
    clientOsText: (p.clientOs ?? []).join(", "),
    audienceSegmentsText: (p.audienceSegments ?? []).join(", "),
    minAppVersion: p.minAppVersion ?? "",
    maxAppVersion: p.maxAppVersion ?? "",
    validFrom:
      (p as PricingRule & { validFrom?: string | null }).validFrom?.slice(
        0,
        16,
      ) ?? "",
    validTo:
      (p as PricingRule & { validTo?: string | null }).validTo?.slice(0, 16) ??
      "",
    daysOfWeek: (p.daysOfWeek ?? []).join(","),
    baseFare: s(p.baseFare),
    perKm: s(p.perKm),
    perMin: s(p.perMin),
    minFare: s(p.minFare),
    maxFare: s(p.maxFare),
    negotiationMin: s(
      (p as PricingRule & { negotiationMin?: number | string | null })
        .negotiationMin,
    ),
    negotiationMax: s(
      (p as PricingRule & { negotiationMax?: number | string | null })
        .negotiationMax,
    ),
    peakMultiplier: s(p.peakMultiplier),
    commissionPct: s(p.commissionPct),
    currency: p.currency ?? "DZD",
    priority: s(p.priority),
    startTime: p.startTime ?? "",
    endTime: p.endTime ?? "",
    metadataJson: p.metadata ? JSON.stringify(p.metadata, null, 2) : "",
  };
}

function numOrUndef(v: string): number | undefined {
  const n = Number(v);
  return v.trim() === "" || Number.isNaN(n) ? undefined : n;
}

function csv(text: string, casing: "upper" | "lower" = "lower") {
  return Array.from(
    new Set(
      text
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) =>
          casing === "upper" ? value.toUpperCase() : value.toLowerCase(),
        ),
    ),
  );
}

export default function PricingPage() {
  const [initialType, setInitialType] = useState("");
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setInitialType(sp.get("vehicleTypeId") ?? "");
  }, []);

  const { data, total, pages, loading, query, setQuery, reload } =
    useList<PricingRule>("/vehicle-pricing", { sortBy: "priority" });
  const [types, setTypes] = useState<VehicleType[]>([]);
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [confirm, setConfirm] = useState<PricingRule | null>(null);
  const [auditFor, setAuditFor] = useState<PricingRule | null>(null);

  useEffect(() => {
    if (initialType) setQuery({ vehicleTypeId: initialType });
  }, [initialType]);

  useEffect(() => {
    api
      .get("/vehicle-types", { params: { limit: 100, sortBy: "sortOrder" } })
      .then((r) => setTypes(r.data.data ?? []))
      .catch(() => setTypes([]));
    api
      .get("/service-areas", { params: { limit: 100, activeOnly: "true" } })
      .then((r) => setAreas(r.data.data ?? []))
      .catch(() => setAreas([]));
  }, []);

  function typeName(id: string) {
    const t = types.find((x) => x.id === id);
    return t ? localized(t) : id;
  }

  async function save() {
    if (!form) return;
    if (!form.vehicleTypeId) return setSaveErr("اختر نوع المركبة");
    for (const [k, lbl] of [
      ["baseFare", "الأجرة الأساسية"],
      ["perKm", "سعر الكيلومتر"],
      ["perMin", "سعر الدقيقة"],
      ["minFare", "الحد الأدنى"],
    ] as [keyof FormState, string][]) {
      if (numOrUndef(form[k] as string) === undefined)
        return setSaveErr(`${lbl} مطلوب`);
    }
    setSaving(true);
    setSaveErr("");
    const body: Record<string, unknown> = {
      vehicleTypeId: form.vehicleTypeId,
      name: form.name.trim() || undefined,
      serviceAreaId: form.serviceAreaId || undefined,
      cityId: form.cityId.trim() || undefined,
      state: form.state.trim() || undefined,
      country: form.country.trim() || undefined,
      customerType: form.customerType || undefined,
      couponCode: form.couponCode.trim() || undefined,
      appIds: csv(form.appIdsText, "lower"),
      clientOs: csv(form.clientOsText, "lower"),
      audienceSegments: csv(form.audienceSegmentsText, "lower"),
      minAppVersion: form.minAppVersion.trim() || undefined,
      maxAppVersion: form.maxAppVersion.trim() || undefined,
      validFrom: form.validFrom
        ? new Date(form.validFrom).toISOString()
        : undefined,
      validTo: form.validTo ? new Date(form.validTo).toISOString() : undefined,
      daysOfWeek: form.daysOfWeek.trim()
        ? form.daysOfWeek
            .split(",")
            .map((item) => Number(item.trim()))
            .filter((item) => !Number.isNaN(item))
        : undefined,
      baseFare: numOrUndef(form.baseFare),
      perKm: numOrUndef(form.perKm),
      perMin: numOrUndef(form.perMin),
      minFare: numOrUndef(form.minFare),
      maxFare: numOrUndef(form.maxFare),
      negotiationMin: numOrUndef(form.negotiationMin),
      negotiationMax: numOrUndef(form.negotiationMax),
      peakMultiplier: numOrUndef(form.peakMultiplier),
      commissionPct: numOrUndef(form.commissionPct),
      currency: form.currency.trim() || undefined,
      priority: numOrUndef(form.priority) ?? 0,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      metadata: form.metadataJson.trim()
        ? JSON.parse(form.metadataJson)
        : undefined,
    };
    try {
      if (form.id) await api.patch(`/vehicle-pricing/${form.id}`, body);
      else await api.post("/vehicle-pricing", body);
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

  async function restore(p: PricingRule) {
    await api.post(`/vehicle-pricing/${p.id}/restore`);
    reload();
  }

  return (
    <div>
      <Topbar title="محرّك التسعير" />
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            قواعد تسعير مرنة حسب النوع والمنطقة والوقت ونوع العميل (حسب
            الأولوية).
          </p>
          <button
            onClick={() => {
              setSaveErr("");
              setForm(
                emptyForm(
                  typeof query.vehicleTypeId === "string"
                    ? query.vehicleTypeId
                    : "",
                ),
              );
            }}
            className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            <Plus size={16} /> قاعدة جديدة
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
            extra={
              <select
                value={
                  typeof query.vehicleTypeId === "string"
                    ? query.vehicleTypeId
                    : ""
                }
                onChange={(e) => setQuery({ vehicleTypeId: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">كل الأنواع</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {localized(t)}
                  </option>
                ))}
              </select>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-400 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3 font-medium">القاعدة</th>
                  <th className="px-4 py-3 font-medium">النوع</th>
                  <th className="px-4 py-3 font-medium">أساسية</th>
                  <th className="px-4 py-3 font-medium">/كم</th>
                  <th className="px-4 py-3 font-medium">الأولوية</th>
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
                      لا توجد قواعد تسعير.
                    </td>
                  </tr>
                ) : (
                  data.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800/60"
                    >
                      <td className="px-4 py-3 font-medium">
                        {p.name || "قاعدة افتراضية"}
                        {p.deletedAt ? (
                          <span className="mr-2 text-[11px] text-red-500">
                            مؤرشفة
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {typeName(p.vehicleTypeId)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {money(Number(p.baseFare))}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {money(Number(p.perKm))}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.priority}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-400">
                          <button
                            title="تعديل"
                            onClick={() => {
                              setSaveErr("");
                              setForm(toForm(p));
                            }}
                            className="hover:text-brand"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            title="سجل التعديلات"
                            onClick={() => setAuditFor(p)}
                            className="hover:text-brand"
                          >
                            <History size={16} />
                          </button>
                          {p.deletedAt ? (
                            <button
                              title="استعادة"
                              onClick={() => restore(p)}
                              className="hover:text-green-600"
                            >
                              <ArchiveRestore size={16} />
                            </button>
                          ) : (
                            <button
                              title="أرشفة"
                              onClick={() => setConfirm(p)}
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
        title={form?.id ? "تعديل قاعدة تسعير" : "قاعدة تسعير جديدة"}
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
            <FormRow>
              <Labeled label="نوع المركبة">
                <select
                  value={form.vehicleTypeId}
                  onChange={(e) =>
                    setForm({ ...form, vehicleTypeId: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="">— اختر النوع —</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {localized(t)}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label="اسم القاعدة (اختياري)">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="منطقة الخدمة (اختياري)">
                <select
                  value={form.serviceAreaId}
                  onChange={(e) =>
                    setForm({ ...form, serviceAreaId: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="">كل المناطق</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label="نوع العميل">
                <select
                  value={form.customerType}
                  onChange={(e) =>
                    setForm({ ...form, customerType: e.target.value })
                  }
                  className={inputCls}
                >
                  {CUSTOMER_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="المدينة ID">
                <input
                  value={form.cityId}
                  onChange={(e) => setForm({ ...form, cityId: e.target.value })}
                  className={inputCls}
                  dir="ltr"
                />
              </Labeled>
              <Labeled label="الولاية / المنطقة">
                <input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className={inputCls}
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="الدولة">
                <input
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  placeholder="DZ"
                />
              </Labeled>
              <Labeled label="كوبون محدد">
                <input
                  value={form.couponCode}
                  onChange={(e) =>
                    setForm({ ...form, couponCode: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  placeholder="AIRPORT10"
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="appIds">
                <input
                  value={form.appIdsText}
                  onChange={(e) =>
                    setForm({ ...form, appIdsText: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  placeholder="nova-passenger, nova-driver"
                />
              </Labeled>
              <Labeled label="أنظمة التشغيل">
                <input
                  value={form.clientOsText}
                  onChange={(e) =>
                    setForm({ ...form, clientOsText: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  placeholder="android, ios"
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="الشرائح">
                <input
                  value={form.audienceSegmentsText}
                  onChange={(e) =>
                    setForm({ ...form, audienceSegmentsText: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  placeholder="vip, beta, airport"
                />
              </Labeled>
              <Labeled label="نطاق الإصدارات">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={form.minAppVersion}
                    onChange={(e) =>
                      setForm({ ...form, minAppVersion: e.target.value })
                    }
                    className={inputCls}
                    dir="ltr"
                    placeholder="من 1.8.0"
                  />
                  <input
                    value={form.maxAppVersion}
                    onChange={(e) =>
                      setForm({ ...form, maxAppVersion: e.target.value })
                    }
                    className={inputCls}
                    dir="ltr"
                    placeholder="إلى 2.5.0"
                  />
                </div>
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="الأجرة الأساسية">
                <input
                  value={form.baseFare}
                  onChange={(e) =>
                    setForm({ ...form, baseFare: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  inputMode="decimal"
                />
              </Labeled>
              <Labeled label="الحد الأدنى للأجرة">
                <input
                  value={form.minFare}
                  onChange={(e) =>
                    setForm({ ...form, minFare: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  inputMode="decimal"
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="سعر الكيلومتر">
                <input
                  value={form.perKm}
                  onChange={(e) => setForm({ ...form, perKm: e.target.value })}
                  className={inputCls}
                  dir="ltr"
                  inputMode="decimal"
                />
              </Labeled>
              <Labeled label="سعر الدقيقة">
                <input
                  value={form.perMin}
                  onChange={(e) => setForm({ ...form, perMin: e.target.value })}
                  className={inputCls}
                  dir="ltr"
                  inputMode="decimal"
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="الحد الأقصى (اختياري)">
                <input
                  value={form.maxFare}
                  onChange={(e) =>
                    setForm({ ...form, maxFare: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  inputMode="decimal"
                />
              </Labeled>
              <Labeled label="معامل الذروة (Peak)">
                <input
                  value={form.peakMultiplier}
                  onChange={(e) =>
                    setForm({ ...form, peakMultiplier: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  inputMode="decimal"
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="حد التفاوض الأدنى">
                <input
                  value={form.negotiationMin}
                  onChange={(e) =>
                    setForm({ ...form, negotiationMin: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  inputMode="decimal"
                />
              </Labeled>
              <Labeled label="حد التفاوض الأعلى">
                <input
                  value={form.negotiationMax}
                  onChange={(e) =>
                    setForm({ ...form, negotiationMax: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  inputMode="decimal"
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="نسبة العمولة %">
                <input
                  value={form.commissionPct}
                  onChange={(e) =>
                    setForm({ ...form, commissionPct: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  inputMode="decimal"
                />
              </Labeled>
              <Labeled
                label="الأولوية"
                hint="الأعلى يُطبّق أولاً عند تطابق أكثر من قاعدة"
              >
                <input
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  inputMode="numeric"
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="وقت البداية (HH:MM)">
                <input
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  placeholder="07:00"
                />
              </Labeled>
              <Labeled label="وقت النهاية (HH:MM)">
                <input
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  placeholder="22:00"
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="نافذة التفعيل من">
                <input
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e) =>
                    setForm({ ...form, validFrom: e.target.value })
                  }
                  className={inputCls}
                />
              </Labeled>
              <Labeled label="نافذة التفعيل إلى">
                <input
                  type="datetime-local"
                  value={form.validTo}
                  onChange={(e) =>
                    setForm({ ...form, validTo: e.target.value })
                  }
                  className={inputCls}
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="أيام الأسبوع" hint="0=الأحد ... 6=السبت">
                <input
                  value={form.daysOfWeek}
                  onChange={(e) =>
                    setForm({ ...form, daysOfWeek: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  placeholder="0,1,2,3,4"
                />
              </Labeled>
              <Labeled label="metadata JSON">
                <textarea
                  value={form.metadataJson}
                  onChange={(e) =>
                    setForm({ ...form, metadataJson: e.target.value })
                  }
                  className={inputCls}
                  dir="ltr"
                  rows={3}
                  placeholder='{"surgeLabel":"airport"}'
                />
              </Labeled>
            </FormRow>
            {saveErr ? <p className="text-sm text-red-500">{saveErr}</p> : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        tone="danger"
        title="أرشفة قاعدة التسعير"
        message={
          confirm ? (
            <>
              ستتم أرشفة هذه القاعدة. لن تتأثر الرحلات السابقة، ويمكن استعادتها.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="أرشفة"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm) {
            await api.delete(`/vehicle-pricing/${confirm.id}`);
            setConfirm(null);
            reload();
          }
        }}
      />

      <Modal
        open={auditFor !== null}
        onClose={() => setAuditFor(null)}
        title="سجل التعديلات"
      >
        {auditFor ? (
          <AuditLog entity="VehiclePricingRule" entityId={auditFor.id} />
        ) : null}
      </Modal>
    </div>
  );
}
