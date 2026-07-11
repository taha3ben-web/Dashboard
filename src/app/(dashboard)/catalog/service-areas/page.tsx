"use client";

import { CSSProperties, useCallback, useMemo, useRef, useState } from "react";
import { GoogleMap, Polygon, Marker } from "@react-google-maps/api";
import clsx from "clsx";
import {
  ArchiveRestore,
  Check,
  Edit3,
  History,
  MapPin,
  Plus,
  Power,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import { ServiceArea } from "@/lib/catalog";
import { useList } from "@/hooks/useList";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toggle } from "@/components/ui/Toggle";
import { AuditLog } from "@/components/catalog/AuditLog";
import { FormRow, Labeled, inputCls } from "@/components/catalog/CatalogForm";
import { PlacesSearch } from "@/components/map/PlacesSearch";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  areaColor,
  geoJSONToPath,
  pathCentroid,
  pathToGeoJSON,
  useGoogleMaps,
  type LatLngLiteral,
} from "@/lib/googleMaps";

const MAP_CONTAINER_STYLE: CSSProperties = { width: "100%", height: "100%" };
const MAP_SECTION_STYLE: CSSProperties = { height: "72vh" };

const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
  clickableIcons: false,
};

// خيارات مضلّع الرسم الجارٍ (نوع أساسي من google.maps فقط).
const DRAFT_POLY_OPTIONS: google.maps.PolygonOptions = {
  fillColor: "#4f46e5",
  fillOpacity: 0.25,
  strokeColor: "#4f46e5",
  strokeWeight: 2,
  clickable: false,
  zIndex: 30,
};

interface FormState {
  id?: string;
  name: string;
  city: string;
  state: string;
  country: string;
  isActive: boolean;
}

function toForm(s: ServiceArea): FormState {
  return {
    id: s.id,
    name: s.name,
    city: s.city ?? "",
    state: s.state ?? "",
    country: s.country ?? "",
    isActive: s.isActive,
  };
}

function errMessage(e: unknown): string {
  const res = (e as { response?: { data?: { message?: string | string[] } } })
    .response;
  const msg = res?.data?.message;
  if (Array.isArray(msg)) return msg.join("، ");
  if (typeof msg === "string") return msg;
  return "تعذّر تنفيذ الإجراء";
}

export default function ServiceAreasPage() {
  const { isLoaded, loadError } = useGoogleMaps();
  const { data, total, loading, query, setQuery, reload } =
    useList<ServiceArea>("/service-areas", { sortBy: "sortOrder", limit: 100 });

  const mapRef = useRef<google.maps.Map | null>(null);
  const selectedPolyRef = useRef<google.maps.Polygon | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [draftPath, setDraftPath] = useState<LatLngLiteral[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [geoSaving, setGeoSaving] = useState(false);
  const [confirm, setConfirm] = useState<ServiceArea | null>(null);
  const [auditFor, setAuditFor] = useState<ServiceArea | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const focusLocation = useCallback((loc: LatLngLiteral) => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo(loc);
    map.setZoom(13);
  }, []);

  const startDrawing = useCallback(() => {
    setSelectedId(null);
    setDraftPath([]);
    setDrawing(true);
  }, []);

  const cancelDrawing = useCallback(() => {
    setDrawing(false);
    setDraftPath([]);
  }, []);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!drawing) return;
      const ll = e.latLng;
      if (!ll) return;
      const point: LatLngLiteral = { lat: ll.lat(), lng: ll.lng() };
      setDraftPath((prev) => [...prev, point]);
    },
    [drawing],
  );

  const undoLastPoint = useCallback(() => {
    setDraftPath((prev) => prev.slice(0, -1));
  }, []);

  const finishDrawing = useCallback(() => {
    if (draftPath.length < 3) return;
    setDrawing(false);
    setSaveErr("");
    setForm({ name: "", city: "", state: "", country: "", isActive: true });
  }, [draftPath.length]);

  async function save() {
    if (!form) return;
    if (!form.name.trim()) {
      setSaveErr("اسم المنطقة مطلوب");
      return;
    }
    setSaving(true);
    setSaveErr("");
    try {
      if (form.id) {
        await api.patch(`/service-areas/${form.id}`, {
          name: form.name.trim(),
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          country: form.country.trim() || undefined,
        });
      } else {
        const geojson = pathToGeoJSON(draftPath);
        if (!geojson) {
          setSaveErr("ارسم حدود المنطقة على الخريطة (٣ نقاط على الأقل)");
          setSaving(false);
          return;
        }
        const c = pathCentroid(draftPath);
        await api.post("/service-areas", {
          name: form.name.trim(),
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          country: form.country.trim() || undefined,
          provider: "GOOGLE",
          geojson,
          centerLat: c ? c.lat : undefined,
          centerLng: c ? c.lng : undefined,
          isActive: form.isActive,
        });
      }
      setForm(null);
      setDraftPath([]);
      reload();
    } catch (e: unknown) {
      setSaveErr(errMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveGeometry() {
    const poly = selectedPolyRef.current;
    if (!poly || !selectedId) return;
    const path = poly
      .getPath()
      .getArray()
      .map((ll) => ({ lat: ll.lat(), lng: ll.lng() }));
    const geojson = pathToGeoJSON(path);
    if (!geojson) return;
    const c = pathCentroid(path);
    setGeoSaving(true);
    try {
      await api.patch(`/service-areas/${selectedId}`, {
        geojson,
        centerLat: c ? c.lat : undefined,
        centerLng: c ? c.lng : undefined,
        provider: "GOOGLE",
      });
      reload();
    } finally {
      setGeoSaving(false);
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

  const selectArea = useCallback(
    (s: ServiceArea) => {
      setSelectedId(s.id);
      if (s.centerLat != null && s.centerLng != null) {
        focusLocation({ lat: s.centerLat, lng: s.centerLng });
      }
    },
    [focusLocation],
  );

  const polygons = useMemo(() => {
    if (!isLoaded) return null;
    return data.map((a, i) => {
      const path = geoJSONToPath(a.geojson);
      if (path.length < 3) return null;
      const selected = a.id === selectedId;
      const color = areaColor(i);
      const opts: google.maps.PolygonOptions = {
        fillColor: color,
        fillOpacity: selected ? 0.35 : 0.18,
        strokeColor: color,
        strokeWeight: selected ? 3 : 2,
        clickable: !drawing,
        editable: selected && !drawing,
        draggable: false,
        zIndex: selected ? 10 : 1,
      };
      const handleLoad = (p: google.maps.Polygon) => {
        if (selected) selectedPolyRef.current = p;
      };
      return (
        <Polygon
          key={a.id}
          paths={path}
          options={opts}
          onLoad={handleLoad}
          onClick={() => {
            if (!drawing) setSelectedId(a.id);
          }}
        />
      );
    });
  }, [data, selectedId, isLoaded, drawing]);

  const draftMarkers = useMemo(() => {
    if (!drawing) return null;
    return draftPath.map((p, idx) => (
      <Marker key={`draft-${idx}`} position={p} label={String(idx + 1)} />
    ));
  }, [drawing, draftPath]);

  const selectedArea = useMemo(
    () => data.find((a) => a.id === selectedId) ?? null,
    [data, selectedId],
  );

  return (
    <div>
      <Topbar title="مناطق الخدمة" />
      <div className="p-4">
        <p className="mb-3 text-sm text-gray-500">
          أدِر نطاقات الخدمة مباشرة على خريطة Google: ارسم الحدود، عدّل
          الرؤوس، وابحث عن أي مدينة أو عنوان.
        </p>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          {/* القائمة الجانبية */}
          <aside className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 p-3 dark:border-gray-800">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold">المناطق ({total})</h2>
                <button
                  onClick={startDrawing}
                  className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
                >
                  <Plus size={14} /> رسم جديد
                </button>
              </div>
              <input
                value={query.search}
                onChange={(e) => setQuery({ search: e.target.value })}
                placeholder="بحث بالاسم..."
                className={inputCls}
              />
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={query.includeDeleted}
                  onChange={(e) => setQuery({ includeDeleted: e.target.checked })}
                />
                إظهار المؤرشفة
              </label>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <p className="p-4 text-center text-sm text-gray-400">
                  جارٍ التحميل...
                </p>
              ) : data.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-400">
                  لا توجد مناطق بعد. ابدأ برسم منطقة.
                </p>
              ) : (
                data.map((s, i) => {
                  const dotStyle: CSSProperties = {
                    backgroundColor: areaColor(i),
                  };
                  const active = s.id === selectedId;
                  return (
                    <div
                      key={s.id}
                      className={clsx(
                        "flex items-center gap-2 border-b border-gray-100 px-3 py-2 last:border-0 dark:border-gray-800/60",
                        active && "bg-brand/5",
                      )}
                    >
                      <button
                        onClick={() => selectArea(s)}
                        className="flex flex-1 items-center gap-2 text-right"
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={dotStyle}
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-medium">
                            {s.name}
                          </span>
                          <span className="block text-xs text-gray-400">
                            {s.city || "—"}
                          </span>
                        </span>
                        {s.deletedAt ? (
                          <span className="text-[10px] text-red-500">مؤرشفة</span>
                        ) : !s.isActive ? (
                          <span className="text-[10px] text-amber-500">موقوفة</span>
                        ) : null}
                      </button>
                      <div className="flex items-center gap-1 text-gray-400">
                        <button
                          title="تفعيل/إيقاف"
                          onClick={() => toggleActive(s)}
                          className={s.isActive ? "text-green-600" : ""}
                        >
                          <Power size={15} />
                        </button>
                        <button
                          title="تعديل البيانات"
                          onClick={() => {
                            setSaveErr("");
                            setForm(toForm(s));
                          }}
                          className="hover:text-brand"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          title="سجل التعديلات"
                          onClick={() => setAuditFor(s)}
                          className="hover:text-brand"
                        >
                          <History size={15} />
                        </button>
                        {s.deletedAt ? (
                          <button
                            title="استعادة"
                            onClick={() => restore(s)}
                            className="hover:text-green-600"
                          >
                            <ArchiveRestore size={15} />
                          </button>
                        ) : (
                          <button
                            title="أرشفة"
                            onClick={() => setConfirm(s)}
                            className="hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* الخريطة */}
          <section
            style={MAP_SECTION_STYLE}
            className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
          >
            {loadError ? (
              <div className="flex h-full items-center justify-center bg-red-500/10 p-6 text-center text-sm text-red-500">
                تعذّر تحميل خريطة Google. تأكّد من ضبط
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY وتفعيل Maps JavaScript API.
              </div>
            ) : !isLoaded ? (
              <div className="flex h-full items-center justify-center bg-gray-100 text-sm text-gray-400 dark:bg-gray-800">
                جارٍ تحميل الخريطة...
              </div>
            ) : (
              <>
                <div className="absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-2">
                  <PlacesSearch onSelect={(loc) => focusLocation(loc)} />
                  {drawing ? (
                    <>
                      <button
                        onClick={finishDrawing}
                        disabled={draftPath.length < 3}
                        className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow hover:bg-brand-dark disabled:opacity-50"
                      >
                        <Check size={16} /> إنهاء الرسم ({draftPath.length})
                      </button>
                      <button
                        onClick={undoLastPoint}
                        disabled={draftPath.length === 0}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white/95 px-3 py-2 text-sm shadow disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/95"
                      >
                        تراجع
                      </button>
                      <button
                        onClick={cancelDrawing}
                        className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow hover:bg-amber-600"
                      >
                        <X size={16} /> إلغاء
                      </button>
                      <span className="rounded-lg bg-white/95 px-3 py-2 text-xs text-gray-600 shadow dark:bg-gray-900/95 dark:text-gray-300">
                        انقر على الخريطة لإضافة رؤوس المنطقة (٣ نقاط على الأقل).
                      </span>
                    </>
                  ) : (
                    <button
                      onClick={startDrawing}
                      className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow hover:bg-brand-dark"
                    >
                      <Plus size={16} /> رسم منطقة
                    </button>
                  )}
                </div>

                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={DEFAULT_CENTER}
                  zoom={DEFAULT_ZOOM}
                  options={MAP_OPTIONS}
                  onLoad={onMapLoad}
                  onClick={handleMapClick}
                >
                  {polygons}
                  {drawing && draftPath.length >= 2 ? (
                    <Polygon paths={draftPath} options={DRAFT_POLY_OPTIONS} />
                  ) : null}
                  {draftMarkers}
                </GoogleMap>

                {selectedArea && !drawing ? (
                  <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-3 shadow-lg dark:bg-gray-900/95">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin size={16} className="text-brand" />
                      <span className="font-medium">{selectedArea.name}</span>
                      <span className="text-xs text-gray-400">
                        اسحب رؤوس المضلّع لتعديل الحدود ثم احفظ.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveGeometry}
                        disabled={geoSaving}
                        className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
                      >
                        <Save size={16} /> {geoSaving ? "جارٍ..." : "حفظ الحدود"}
                      </button>
                      <button
                        onClick={() => setSelectedId(null)}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                      >
                        <X size={16} /> إلغاء التحديد
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>

      {/* نافذة بيانات المنطقة */}
      <Modal
        open={form !== null}
        onClose={() => {
          setForm(null);
          setDraftPath([]);
        }}
        title={form?.id ? "تعديل بيانات المنطقة" : "منطقة جديدة"}
        footer={
          <>
            <button
              onClick={() => {
                setForm(null);
                setDraftPath([]);
              }}
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
            {!form.id ? (
              <div className="rounded-lg bg-brand/5 p-3 text-xs text-brand">
                تم رسم حدود المنطقة على الخريطة ({draftPath.length} نقطة).
                أكمِل البيانات للحفظ.
              </div>
            ) : null}
            <Labeled label="اسم المنطقة">
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, name: e.target.value } : f))
                }
                className={inputCls}
              />
            </Labeled>
            <FormRow>
              <Labeled label="المدينة">
                <input
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, city: e.target.value } : f))
                  }
                  className={inputCls}
                />
              </Labeled>
              <Labeled label="الولاية/المحافظة">
                <input
                  value={form.state}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, state: e.target.value } : f))
                  }
                  className={inputCls}
                />
              </Labeled>
            </FormRow>
            <FormRow>
              <Labeled label="الدولة">
                <input
                  value={form.country}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, country: e.target.value } : f))
                  }
                  className={inputCls}
                />
              </Labeled>
              {!form.id ? (
                <Labeled label="الحالة">
                  <Toggle
                    checked={form.isActive}
                    onChange={(v) =>
                      setForm((f) => (f ? { ...f, isActive: v } : f))
                    }
                    label={form.isActive ? "مفعّلة" : "موقوفة"}
                  />
                </Labeled>
              ) : (
                <div />
              )}
            </FormRow>
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
            <>
              ستتم أرشفة <b>{confirm.name}</b>. يمكن استعادتها لاحقًا.
            </>
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
            if (selectedId === confirm.id) setSelectedId(null);
            reload();
          }
        }}
      />

      <Modal
        open={auditFor !== null}
        onClose={() => setAuditFor(null)}
        title={`سجل التعديلات — ${auditFor ? auditFor.name : ""}`}
      >
        {auditFor ? (
          <AuditLog entity="ServiceArea" entityId={auditFor.id} />
        ) : null}
      </Modal>
    </div>
  );
}
