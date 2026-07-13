export interface Setting {
  id: string;
  key: string;
  value: unknown;
  group?: string | null;
  isPublic: boolean;
  isSensitive: boolean;
  hasValue?: boolean;
  masked?: boolean;
  version: number;
  updatedAt: string;
}

export interface City {
  id: string;
  name: string;
  country?: string | null;
  isActive: boolean;
  centerLat?: number | null;
  centerLng?: number | null;
  _count?: { zones: number; drivers: number; trips: number };
}

export interface Zone {
  id: string;
  cityId: string;
  name: string;
  polygon?: unknown;
  city?: { id: string; name: string };
}

export interface SettingForm {
  open: boolean;
  originalKey: string | null;
  key: string;
  group: string;
  value: string;
  isPublic: boolean;
  isSensitive: boolean;
  hasStoredSecret: boolean;
}

export interface CityForm {
  open: boolean;
  id: string | null;
  name: string;
  country: string;
  centerLat: string;
  centerLng: string;
  isActive: boolean;
}

export interface ZoneForm {
  open: boolean;
  id: string | null;
  cityId: string;
  name: string;
  polygon: string;
}

export interface DeleteTarget {
  type: "setting" | "city" | "zone";
  id: string;
  label: string;
}
