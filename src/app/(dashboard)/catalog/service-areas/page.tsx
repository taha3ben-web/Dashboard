"use client";

import { useState } from "react";
import { ArchiveRestore, Edit3, History, MapPin, Plus, Trash2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import { MAP_PROVIDERS, ServiceArea } from "@/lib/catalog";
import { useList } from "@/hooks/useList";
import { TableToolbar } from "@/components/catalog/TableToolbar";
import { Pagination } from "@/components/catalog/Pagination";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AuditLog } from "@/components/catalog/AuditLog";
import { FormRow, Labeled, inputCls } from "@/components/catalog/CatalogForm";

const SORT_OPTIONS = [
  { value: "name", label: "الاسم" },
  { value: "sortOrder", label: "الترتيب" },
  { value: "createdAt", label: "تاريخ الإنشاء" },
];

interface FormState {
  id?: string;
  name: string;
  city: string;
  state: string;
  country: string;
  provider: string;
  centerLat: string;
  centerLng: string;
  geojson: string;
}

function emptyForm(): FormState {
  return {
    name: "",
    city: "",
    state: "",
    country: "",
    provider: "GEOJSON",
    centerLat: "",
    centerLng: "",
    geojson: "",
  };
}

function toForm(s: ServiceArea): FormState {
  return {
    id: s.id,
    name: s.name,
    city: s.city ?? "",
    state: s.state ?? "",
    country: s.country ?? "",
    provider: s.provider,
    centerLat: s.centerLat != null ? String(s.centerLat) : "",
    centerLng: s.centerLng != null ? String(s.centerLng) : "",
    geojson: s.geojson ? JSON.stringify(s.geojson, null, 2) : "",
  };
}

export default function ServiceAreasPage() {
  const { data, total, pages, loading, query, setQuery, reload } =
    useList<ServiceArea>("/service-areas", { sortBy: "sortOrder" });
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [confirm, setConfirm] = useState<ServiceArea | null>(null);
  const [auditFor, setAuditFor] = useState<ServiceArea | null>(null);

  async function save() {
    if (!form) return;
    if (!form.name.trim()) return setSaveErr("اسم المنطقة مطلوب");
    let geojson: unknown;
    if (form.geojson.trim()) {
      try {
        geojson = JSON.parse(form.geojson);
      } catch {
        return setSaveErr("صيغة GeoJSON غير صالحة");
      }
    }
    setSaving(true);
    setSaveErr("");
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      country: form.country.trim() || undefined,
      provider: form.provider,
      centerLat: form.centerLat ? Number(form.centerLat) : undefined,
      centerLng: form.centerLng ? Number(form.centerLng) : undefined,
      geojson: geojson ?? undefined,
    };
    try {
      if (form.id) await api.patch(`/service-areas/${form.id}`, body);
      else await api.post("/service-areas", body);
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

  async function toggleActive(s: ServiceArea) {
    await api.patch(`/service-areas/${s.id}/active`, { isActive: !s.isActive });
    reload();
  }
  async function restore(s: ServiceArea) {
    await api.post(`/service-areas/${s.id}/restore`);
    reload();
  }

  return (
    <div>
      <Topbar title="مناطق الخدمة" />
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            نطاقات جغرافية مستقلة عن مزوّد الخرائط (GeoJSON أو مزوّد خارجي).
          </p>
          <button
            onClick={() => {
              setSaveErr("");
              setForm(emptyForm());
            }}
            className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            <Plus size={16} /> منطقة جديدة
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
                  <th className="px-4 py-3 font-medium">المنطقة</th>
                  <th className="px-4 py-3 font-medium">المدينة</th>
                  <th className="px-4 py-3 font-medium">المزوّد</th>
                  <th className="px-4 py-3 font-medium">نشط</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      جارٍ التحميل...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      لا توجد مناطق.
                    </td>
                  </tr>
                ) : (
                  data.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-brand" />
                          <span className="font-medium">{s.name}</span>
                          {s.deletedAt ? (
                            <span className="text-[11px] text-red-500">مؤرشفة</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.city || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{s.provider}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(s)}
                          className={s.isActive ? "text-green-600" : "text-gray-400"}
                        >
                          {s.isActive ? "مفعّل" : "موقوف"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-400">
                          <button
                            title="تعديل"
                            onClick={() => {
                              setSaveErr("");
                              setForm(toForm(s));
                            }}
                            className="hover:text-brand"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            title="سجل التعديلات"
                            onClick={() => setAuditFor(s)}
                            className="hover:text-brand"
                          >
                            <History size={16} />
                          </button>
                          {s.deletedAt ? (
                            <button
                              title="استعادة"
                              onClick={() => restore(s)}
                              className="hover:text-green-600"
                            >
                              <ArchiveRestore size={16} />
                            </button>
                          ) : (
                            <button
                              title="أرشفة"
                              onClick={() => setConfirm(s)}
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
        title={form?.id ? "تعديل منطقة" : "منطقة جديدة"}
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
            <Labeled label="اسم المنطقة">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </Labeled>
            <FormRow>
              <Labeled label="المدينة">
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={inputCls}
                />
              </Labeled>
              <Labeled label="الولاية/المحافظة">
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
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className={inputCls}
                />
              </Labeled>
              <Labeled label="مزوّد الخرائط">
                <select
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  className={inputCls}
                >
                  {MAP_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="خط العرض (Lat)">
                <input
                  value={form.centerLat}
                  onChange={(e) => setForm({ ...form, centerLat: e.target.value })}
                  className={inputCls}
                  dir="ltr"
                  inputMode="decimal"
                />
              </Labeled>
              <Labeled label="خط الطول (Lng)">
                <input
                  value={form.centerLng}
                  onChange={(e) => setForm({ ...form, centerLng: e.target.value })}
                  className={inputCls}
                  dir="ltr"
                  inputMode="decimal"
                />
              </Labeled>
            </FormRow>
            <Labeled
              label="GeoJSON (اختياري)"
              hint="الصق مضلع الحدود بصيغة GeoJSON. يعمل مع أي مزوّد خرائط."
            >
              <textarea
                value={form.geojson}
                onChange={(e) => setForm({ ...form, geojson: e.target.value })}
                rows={5}
                dir="ltr"
                className={inputCls + " font-mono text-xs"}
                placeholder='{"type":"Polygon","coordinates":[...]}'
              />
            </Labeled>
            {saveErr ? <p className="text-sm text-red-500">{saveErr}</p> : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        tone="danger"
        title="أرشفة المنطقة"
        message={
          confirm ? (
            <>ستتم أرشفة <b>{confirm.name}</b>. يمكن استعادتها لاحقًا.</>
          ) : (
            ""
          )
        }
        confirmLabel="أرشفة"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm) {
            await api.delete(`/service-areas/${confirm.id}`);
            setConfirm(null);
            reload();
          }
        }}
      />

      <Modal
        open={auditFor !== null}
        onClose={() => setAuditFor(null)}
        title={`سجل التعديلات — ${auditFor ? auditFor.name : ""}`}
      >
        {auditFor ? <AuditLog entity="ServiceArea" entityId={auditFor.id} /> : null}
      </Modal>
    </div>
  );
}
