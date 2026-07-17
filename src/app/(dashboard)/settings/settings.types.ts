export interface Setting {
  id: string;
  key: string;
  value: unknown;
  group?: string | null;
  isPublic: boolean;
  isSensitive: boolean;
  hasValue?: boolean;
  masked?: boolean;
  publicationStatus: "DRAFT" | "PUBLISHED";
  version: number;
  publishedVersion: number;
  publishedAt?: string | null;
  updatedAt: string;
  changeRequests?: Array<{
    id: string;
    status: "PENDING";
    requestedById: string;
    sourceVersion: number;
    createdAt: string;
  }>;
}

export interface SettingRevision {
  id: string;
  publishedVersion: number;
  sourceVersion: number;
  value: unknown;
  action: string;
  publishedById?: string | null;
  createdAt: string;
}

export interface SettingChangeRequest {
  id: string;
  requestedValue: unknown;
  sourceVersion: number;
  requestType: string;
  rollbackFromVersion?: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  setting: {
    id: string;
    key: string;
    group?: string | null;
    version: number;
    publishedVersion: number;
    publishedValue?: unknown;
  };
  requestedBy: { id: string; name: string; email?: string | null };
  reviewedBy?: { id: string; name: string; email?: string | null } | null;
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
