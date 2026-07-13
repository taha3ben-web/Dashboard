export interface StaffMe {
  userId: string;
  role: string;
  permissions: string[];
  user: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    type: string;
    status: string;
  };
  staffRole?: {
    id: string;
    name: string;
  } | null;
}

const ROUTE_RULES: Array<{ prefix: string; permissions: string[] }> = [
  { prefix: "/drivers", permissions: ["drivers.read", "drivers.manage", "drivers.documents"] },
  { prefix: "/passengers", permissions: ["passengers.read", "passengers.manage"] },
  { prefix: "/trips", permissions: ["trips.read", "trips.manage"] },
  { prefix: "/live-map", permissions: ["drivers.read", "reports.read"] },
  { prefix: "/earnings", permissions: ["payments.read", "reports.read"] },
  { prefix: "/wallets", permissions: ["payments.read", "payments.manage"] },
  { prefix: "/driver-funding", permissions: ["funding.read", "funding.manage"] },
  { prefix: "/driver-transfers", permissions: ["transfer.read", "transfer.manage"] },
  { prefix: "/withdrawals", permissions: ["payments.read", "payments.manage"] },
  { prefix: "/financial-dashboard", permissions: ["payments.read", "reports.read"] },
  { prefix: "/financial-control", permissions: ["payments.read", "reports.read"] },
  { prefix: "/financial-transactions", permissions: ["payments.read", "reports.read"] },
  { prefix: "/payments", permissions: ["payments.read", "payments.manage"] },
  { prefix: "/reports", permissions: ["reports.read"] },
  { prefix: "/coupons", permissions: ["coupons.manage"] },
  { prefix: "/notifications", permissions: ["notifications.send"] },
  { prefix: "/operations", permissions: ["reports.read", "support.manage", "safety.manage"] },
  { prefix: "/agents", permissions: ["agents.manage", "staff.manage"] },
  { prefix: "/ads", permissions: ["settings.manage"] },
  { prefix: "/access-control", permissions: ["staff.manage"] },
  { prefix: "/security-center", permissions: ["audit.read", "staff.manage"] },
  { prefix: "/safety", permissions: ["safety.manage", "support.manage"] },
  { prefix: "/support", permissions: ["support.manage"] },
  { prefix: "/app-versions", permissions: ["settings.manage"] },
  { prefix: "/settings", permissions: ["settings.manage"] },
  { prefix: "/catalog/categories", permissions: ["pricing.manage", "settings.manage"] },
  { prefix: "/catalog/vehicle-types", permissions: ["pricing.manage", "settings.manage"] },
  { prefix: "/catalog/features", permissions: ["pricing.manage", "settings.manage"] },
  { prefix: "/catalog/service-areas", permissions: ["pricing.manage", "settings.manage"] },
  { prefix: "/catalog/pricing", permissions: ["pricing.manage"] },
  { prefix: "/catalog/analytics", permissions: ["pricing.manage", "reports.read"] },
  { prefix: "/", permissions: ["reports.read", "drivers.read", "trips.read"] },
];

export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes("*") || permissions.includes(required);
}

export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  return required.some((item) => hasPermission(permissions, item));
}

export function canAccessPath(pathname: string, permissions: string[]): boolean {
  const rule = ROUTE_RULES.find((item) =>
    item.prefix === "/" ? pathname === "/" : pathname.startsWith(item.prefix),
  );
  if (!rule) return permissions.includes("*");
  return hasAnyPermission(permissions, rule.permissions);
}

export function firstAccessiblePath(permissions: string[]): string {
  const priority = [
    "/",
    "/operations",
    "/financial-dashboard",
    "/financial-control",
    "/financial-transactions",
    "/driver-funding",
    "/driver-transfers",
    "/withdrawals",
    "/payments",
    "/reports",
    "/support",
    "/drivers",
    "/passengers",
    "/trips",
    "/wallets",
    "/live-map",
    "/notifications",
    "/coupons",
    "/access-control",
    "/security-center",
    "/agents",
    "/ads",
    "/safety",
    "/app-versions",
    "/settings",
    "/catalog/pricing",
    "/catalog/categories",
    "/catalog/vehicle-types",
    "/catalog/features",
    "/catalog/service-areas",
    "/catalog/analytics",
  ];

  for (const path of priority) {
    if (canAccessPath(path, permissions)) return path;
  }

  return "/login";
}
