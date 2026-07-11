/**
 * طبقة الكتالوج المشتركة للوحة: أنواع + ثوابت + مساعدات.
 * تعكس بنية الباك-إند (Enterprise Catalog).
 */

export type WorkflowStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const LOCALES = [
  { code: "ar", label: "العربية", dir: "rtl" as const },
  { code: "fr", label: "Fran\u00e7ais", dir: "ltr" as const },
  { code: "en", label: "English", dir: "ltr" as const },
] as const;
export type LocaleCode = (typeof LOCALES)[number]["code"];

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  DRAFT: "مسودة",
  PENDING: "قيد المراجعة",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

// انتقالات الحالة المسموحة (تطابق الباك-إند).
export const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  DRAFT: ["PENDING", "PUBLISHED", "ARCHIVED"],
  PENDING: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED", "DRAFT"],
  ARCHIVED: ["DRAFT", "PUBLISHED"],
};

export const USAGE_TYPES = [
  { value: "RIDE", label: "رحلات" },
  { value: "DELIVERY", label: "توصيل" },
  { value: "BOTH", label: "كلاهما" },
];

export const CATALOG_DOMAINS = [
  { value: "MOBILITY", label: "تنقّل" },
  { value: "FOOD", label: "توصيل طعام" },
  { value: "PARCEL", label: "طرود" },
  { value: "CORPORATE", label: "شركات" },
  { value: "RENTAL", label: "تأجير" },
];

export const ICON_TYPES = ["EMOJI", "PNG", "SVG", "ICON_PACK", "LOTTIE"];
export const MAP_PROVIDERS = ["GEOJSON", "GOOGLE", "OSM", "MAPBOX"];

export const FIELD_TYPES = [
  { value: "TEXT", label: "نص" },
  { value: "NUMBER", label: "رقم" },
  { value: "BOOLEAN", label: "نعم/لا" },
  { value: "SELECT", label: "اختيار واحد" },
  { value: "MULTISELECT", label: "اختيار متعدد" },
];

// أنواع المستندات (للمتطلبات).
export const DOCUMENT_TYPES = [
  "LICENSE",
  "ID_CARD",
  "INSURANCE",
  "REGISTRATION",
  "PROFILE_PHOTO",
];

type I18nMap = Record<string, string> | null | undefined;

/** يرجع الاسم باللغة المطلوبة مع fallback للاسم الأساسي. */
export function localized(
  row: { name?: string; nameI18n?: I18nMap },
  locale: LocaleCode = "ar",
): string {
  const i = row.nameI18n as Record<string, string> | undefined | null;
  return (i && i[locale]) || row.name || "";
}

export interface AuditActor {
  id: string;
  name: string;
  phone: string;
}
export interface AuditEntry {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  meta?: unknown;
  createdAt: string;
  actor?: AuditActor | null;
}

export interface VehicleCategory {
  id: string;
  name: string;
  nameI18n?: I18nMap;
  description?: string | null;
  descriptionI18n?: I18nMap;
  iconType: string;
  iconValue?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  usageType: string;
  domain: string;
  status: WorkflowStatus;
  isActive: boolean;
  sortOrder: number;
  version: number;
  deletedAt?: string | null;
  _count?: { types: number };
}

export interface VehicleType {
  id: string;
  categoryId?: string | null;
  name: string;
  nameI18n?: I18nMap;
  description?: string | null;
  descriptionI18n?: I18nMap;
  multiplier?: number | null;
  capacity?: number | null;
  luggage?: number | null;
  notes?: string | null;
  usageType: string;
  allowsNegotiation?: boolean;
  supportsCash?: boolean;
  supportsWallet?: boolean;
  requiresApproval?: boolean;
  visibleToPassengers?: boolean;
  visibleToDrivers?: boolean;
  iconType: string;
  iconValue?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  minVehicleYear?: number | null;
  minDriverRating?: number | null;
  minDriverTrips?: number | null;
  requiredLicenseType?: string | null;
  requiredDocuments?: string[];
  requiredPhotos?: string[];
  requirements?: Record<string, unknown> | null;
  status: WorkflowStatus;
  isActive: boolean;
  sortOrder: number;
  version: number;
  deletedAt?: string | null;
  category?: VehicleCategory | null;
  features?: Array<{ feature: Feature }>;
  fields?: VehicleField[];
  pricingRules?: PricingRule[];
  _count?: { pricingRules?: number; vehicles?: number };
}

export interface Feature {
  id: string;
  code: string;
  name: string;
  nameI18n?: I18nMap;
  iconType: string;
  iconValue?: string | null;
  iconUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  version: number;
  deletedAt?: string | null;
}

export interface ServiceArea {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  geojson?: { type: "Polygon"; coordinates: number[][][] } | null;
  provider: string;
  providerRef?: Record<string, unknown> | null;
  centerLat?: number | null;
  centerLng?: number | null;
  isActive: boolean;
  sortOrder: number;
  version: number;
  deletedAt?: string | null;
}

export interface PricingRule {
  id: string;
  vehicleTypeId: string;
  name?: string | null;
  serviceAreaId?: string | null;
  cityId?: string | null;
  customerType?: string | null;
  couponCode?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  daysOfWeek?: number[];
  peakMultiplier?: number | null;
  baseFare: number | string;
  perKm: number | string;
  perMin: number | string;
  minFare: number | string;
  maxFare?: number | string | null;
  commissionPct?: number | string | null;
  currency?: string | null;
  priority: number;
  isActive: boolean;
  version: number;
  deletedAt?: string | null;
  vehicleType?: VehicleType | null;
}

export interface VehicleField {
  id: string;
  vehicleTypeId: string;
  key: string;
  label: string;
  labelI18n?: I18nMap;
  fieldType: string;
  options?: unknown[] | null;
  required: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface CatalogAnalytics {
  totals: {
    categories: number;
    vehicleTypes: number;
    published: number;
    pricingRules: number;
    features: number;
    serviceAreas: number;
  };
  perType: Array<{
    id: string;
    name: string;
    trips: number;
    revenue: number;
    avgFare: number;
    drivers: number;
  }>;
  mostUsed?: { id: string; name: string; trips: number } | null;
  leastUsed?: { id: string; name: string; trips: number } | null;
  mostProfitable?: { id: string; name: string; revenue: number } | null;
}
