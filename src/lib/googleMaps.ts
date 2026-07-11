"use client";

import { useJsApiLoader } from "@react-google-maps/api";

/**
 * طبقة Google Maps المشتركة للوحة — Google Maps فقط (بلا Leaflet/OSM/MapLibre).
 * توفّر: خطّاف تحميل الـ JS API، وثوابت، ومساعدات GeoJSON.
 */

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

// مكتبات Google المطلوبة (ثابتة المرجع لمنع إعادة التحميل).
// places للبحث عن المدن/العناوين. الرسم يتم يدويًا بالنقر دون مكتبة drawing.
export type MapLibrary = "places";
export const GOOGLE_MAPS_LIBRARIES: MapLibrary[] = ["places"];
export const GOOGLE_MAPS_LOADER_ID = "nova-google-maps-loader";

// مركز افتراضي: الجزائر العاصمة.
export const DEFAULT_CENTER: LatLngLiteral = { lat: 36.7538, lng: 3.0588 };
export const DEFAULT_ZOOM = 11;

/** مفتاح Google Maps من متغيّرات البيئة العامة. */
export function googleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
}

/** خطّاف تحميل Google Maps JS API (يُدار مرّة واحدة عبر اللوحة). */
export function useGoogleMaps(): {
  isLoaded: boolean;
  loadError: Error | undefined;
} {
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: googleMapsApiKey(),
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: "ar",
    region: "DZ",
  });
  return { isLoaded, loadError };
}

/** يحوّل مسار مضلّع إلى GeoJSON Polygon (حلقة مغلقة). */
export function pathToGeoJSON(path: LatLngLiteral[]): GeoJSONPolygon | null {
  if (path.length < 3) return null;
  const ring: number[][] = path.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

/** يحوّل GeoJSON المخزّن إلى مسار صالح للعرض/التحرير. */
export function geoJSONToPath(
  geojson: GeoJSONPolygon | null | undefined,
): LatLngLiteral[] {
  if (
    !geojson ||
    geojson.type !== "Polygon" ||
    !Array.isArray(geojson.coordinates)
  ) {
    return [];
  }
  const ring = geojson.coordinates[0];
  if (!Array.isArray(ring)) return [];
  const path: LatLngLiteral[] = [];
  for (const point of ring) {
    if (Array.isArray(point) && point.length >= 2) {
      const lng = Number(point[0]);
      const lat = Number(point[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        path.push({ lat, lng });
      }
    }
  }
  if (path.length > 1) {
    const a = path[0];
    const b = path[path.length - 1];
    if (a.lat === b.lat && a.lng === b.lng) path.pop();
  }
  return path;
}

/** مركز تقريبي (متوسط النقاط) لمضلّع. */
export function pathCentroid(path: LatLngLiteral[]): LatLngLiteral | null {
  if (path.length === 0) return null;
  let lat = 0;
  let lng = 0;
  for (const p of path) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / path.length, lng: lng / path.length };
}

// لوحة ألوان ثابتة لتلوين المناطق.
export const AREA_PALETTE = [
  "#4f46e5",
  "#059669",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
];
export function areaColor(index: number): string {
  return AREA_PALETTE[Math.abs(index) % AREA_PALETTE.length];
}
