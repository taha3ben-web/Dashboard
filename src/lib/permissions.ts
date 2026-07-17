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
  {
    prefix: "/drivers",
    permissions: ["drivers.read", "drivers.manage", "drivers.documents"],
  },
  {
    prefix: "/driver-sanctions",
    permissions: ["drivers.read", "drivers.manage"],
  },
  {
    prefix: "/passengers",
    permissions: ["passengers.read", "passengers.manage"],
  },
  { prefix: "/trips", permissions: ["trips.read", "trips.manage"] },
  {
    prefix: "/matching-intelligence",
    permissions: ["trips.read", "reports.read"],
  },
  {
    prefix: "/customer-360",
    permissions: ["passengers.read", "passengers.manage"],
  },
  { prefix: "/live-map", permissions: ["drivers.read", "reports.read"] },
  { prefix: "/marketplace", permissions: ["drivers.read", "drivers.manage"] },
  { prefix: "/vehicles", permissions: ["drivers.read", "drivers.manage"] },
  { prefix: "/earnings", permissions: ["payments.read", "reports.read"] },
  { prefix: "/wallets", permissions: ["payments.read", "payments.manage"] },
  {
    prefix: "/driver-funding",
    permissions: ["funding.read", "funding.manage"],
  },
  {
    prefix: "/driver-transfers",
    permissions: ["transfer.read", "transfer.manage"],
  },
  { prefix: "/withdrawals", permissions: ["payments.read", "payments.manage"] },
  {
    prefix: "/financial-dashboard",
    permissions: ["payments.read", "reports.read"],
  },
  {
    prefix: "/financial-control",
    permissions: ["payments.read", "reports.read"],
  },
  {
    prefix: "/financial-transactions",
    permissions: ["payments.read", "reports.read"],
  },
  {
    prefix: "/ledger-integrity",
    permissions: ["payments.read", "reports.read"],
  },
  {
    prefix: "/fraud-operations",
    permissions: ["risk.review", "risk.manage"],
  },
  {
    prefix: "/payout-integrity",
    permissions: ["payments.read", "payments.manage"],
  },
  {
    prefix: "/payout-settlement",
    permissions: ["payments.read", "payments.manage"],
  },
  { prefix: "/payment-gateways", permissions: ["payments.read", "payments.manage"] },
  { prefix: "/payments", permissions: ["payments.read", "payments.manage"] },
  { prefix: "/refunds", permissions: ["payments.read", "payments.manage"] },
  { prefix: "/risk-reviews", permissions: ["risk.review", "risk.manage"] },
  { prefix: "/risk-holds", permissions: ["risk.manage"] },
  { prefix: "/blacklist", permissions: ["risk.manage"] },
  { prefix: "/risk-events", permissions: ["risk.review", "risk.manage"] },
  { prefix: "/reports", permissions: ["reports.read"] },
  { prefix: "/coupons", permissions: ["coupons.manage"] },
  { prefix: "/subscriptions", permissions: ["subscriptions.manage"] },
  { prefix: "/kyc", permissions: ["kyc.manage"] },
  { prefix: "/notifications", permissions: ["notifications.send"] },
  { prefix: "/message-templates", permissions: ["notifications.send"] },
  { prefix: "/content-blocks", permissions: ["settings.manage"] },
  { prefix: "/backups", permissions: ["settings.manage"] },
  { prefix: "/queue-health", permissions: ["reports.read"] },
  {
    prefix: "/operations",
    permissions: ["reports.read"],
  },
  { prefix: "/reliability", permissions: ["reports.read"] },
  { prefix: "/agents", permissions: ["agents.manage", "staff.manage"] },
  { prefix: "/ads", permissions: ["settings.manage"] },
  { prefix: "/access-control", permissions: ["staff.manage"] },
  { prefix: "/security-center", permissions: ["audit.read", "staff.manage"] },
  { prefix: "/safety", permissions: ["safety.manage", "support.manage"] },
  { prefix: "/support", permissions: ["support.manage"] },
  { prefix: "/ratings", permissions: ["support.manage"] },
  { prefix: "/customer-experience", permissions: ["support.manage"] },
  { prefix: "/app-versions", permissions: ["settings.manage"] },
  { prefix: "/feature-flags-health", permissions: ["settings.manage"] },
  { prefix: "/feature-flags", permissions: ["settings.manage"] },
  { prefix: "/release-control", permissions: ["settings.manage"] },
  { prefix: "/setting-approvals", permissions: ["settings.manage"] },
  { prefix: "/settings-governance", permissions: ["settings.manage"] },
  { prefix: "/legal-documents", permissions: ["settings.manage"] },
  { prefix: "/maps-provider", permissions: ["settings.manage"] },
  {
    prefix: "/geofence",
    permissions: ["settings.manage", "pricing.manage"],
  },
  { prefix: "/bootstrap", permissions: ["settings.manage"] },
  { prefix: "/settings", permissions: ["settings.manage"] },
  { prefix: "/city-scaling", permissions: ["settings.manage"] },
  {
    prefix: "/catalog/categories",
    permissions: ["pricing.manage", "settings.manage"],
  },
  {
    prefix: "/catalog/vehicle-types",
    permissions: ["pricing.manage", "settings.manage"],
  },
  {
    prefix: "/catalog/features",
    permissions: ["pricing.manage", "settings.manage"],
  },
  {
    prefix: "/catalog/service-areas",
    permissions: ["pricing.manage", "settings.manage"],
  },
  { prefix: "/catalog/pricing", permissions: ["pricing.manage"] },
  { prefix: "/fare-quotes", permissions: ["pricing.manage"] },
  { prefix: "/fare-offers", permissions: ["pricing.manage"] },
  {
    prefix: "/catalog/analytics",
    permissions: ["pricing.manage", "reports.read"],
  },
  { prefix: "/", permissions: ["reports.read", "drivers.read", "trips.read"] },
];

export function hasPermission(
  permissions: string[],
  required: string,
): boolean {
  return permissions.includes("*") || permissions.includes(required);
}

export function hasAnyPermission(
  permissions: string[],
  required: string[],
): boolean {
  if (required.length === 0) return true;
  return required.some((item) => hasPermission(permissions, item));
}

export function canAccessPath(
  pathname: string,
  permissions: string[],
): boolean {
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
    "/reliability",
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
    "/marketplace",
    "/notifications",
    "/coupons",
    "/access-control",
    "/security-center",
    "/agents",
    "/ads",
    "/safety",
    "/app-versions",
    "/feature-flags",
    "/release-control",
    "/setting-approvals",
    "/settings",
    "/city-scaling",
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
