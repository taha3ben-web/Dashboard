import { api } from "./api";

export type OpsSeverity = "OK" | "WARN" | "CRITICAL";

export interface OpsPanel {
  key: string;
  severity: OpsSeverity;
  metrics: Record<string, number>;
}

export interface OpsOverview {
  health: { severity: OpsSeverity; panels: OpsPanel[] };
  generatedAt: string;
}

export interface SettlementRow {
  id: string;
  fare?: number | string | null;
  currency?: string;
  settlementStatus?: string;
  settlementAttempts?: number;
  settlementError?: string | null;
  completedAt?: string | null;
  passenger?: { name?: string; phone?: string };
  driver?: { user?: { name?: string; phone?: string } } | null;
}

export interface DeadLetterRow {
  id: string;
  name: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  updatedAt: string;
}

export interface ReconciliationIncidentRow {
  id: string;
  accountCode: string;
  currency: string;
  cachedBalance: number | string;
  derivedBalance: number | string;
  difference: number | string;
  status: string;
  createdAt: string;
}

export interface RiskReviewRow {
  id: string;
  subjectKind: string;
  subjectId: string;
  action: string;
  score: number;
  status: string;
  createdAt: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardOperations {
  ts: string;
  uptimeSec: number;
  health: {
    db: { ok: boolean; latencyMs?: number; error?: string };
    redis: { ok: boolean; latencyMs?: number; error?: string };
  };
  queues: {
    driversWithGeo: number;
    onlineDrivers: number;
    busyDrivers: number;
    activeTrips: number;
    openTickets: number;
    openComplaints: number;
    pendingWithdrawals: number;
  };
  recentTrips: Array<{
    id: string;
    status: string;
    createdAt: string;
    passenger?: { name?: string };
    driver?: { user?: { name?: string } } | null;
  }>;
}

export interface OpsSnapshot {
  overview: OpsOverview;
  realtime: DashboardOperations;
  settlements: PageResult<SettlementRow>;
  deadLetters: {
    stats: Record<string, number>;
    items: DeadLetterRow[];
  };
  incidents: PageResult<ReconciliationIncidentRow>;
  riskReviews: RiskReviewRow[];
}

export async function loadOpsSnapshot(): Promise<OpsSnapshot> {
  const [overview, realtime, settlements, deadLetters, incidents, riskReviews] =
    await Promise.all([
      api.get<OpsOverview>("/dashboard/ops/overview"),
      api.get<DashboardOperations>("/dashboard/operations"),
      api.get<PageResult<SettlementRow>>("/dashboard/ops/settlements", {
        params: { page: 1, limit: 25 },
      }),
      api.get<OpsSnapshot["deadLetters"]>("/dashboard/ops/dead-letters", {
        params: { limit: 50 },
      }),
      api.get<PageResult<ReconciliationIncidentRow>>(
        "/dashboard/ops/incidents",
        { params: { page: 1, limit: 25, status: "OPEN" } },
      ),
      api.get<RiskReviewRow[]>("/dashboard/ops/risk-reviews", {
        params: { status: "OPEN" },
      }),
    ]);

  return {
    overview: overview.data,
    realtime: realtime.data,
    settlements: settlements.data,
    deadLetters: deadLetters.data,
    incidents: incidents.data,
    riskReviews: riskReviews.data,
  };
}

export const opsActions = {
  retryFailedSettlements: () =>
    api.post("/dashboard/ops/settlements/retry", {
      limit: 25,
      onlyFailed: true,
    }),
  retryDeadLetter: (id: string) =>
    api.post(`/dashboard/ops/dead-letters/${id}/retry`),
  runReconciliation: () => api.post("/dashboard/ops/reconciliation/run"),
  resolveIncident: (id: string) =>
    api.post(`/dashboard/ops/incidents/${id}/resolve`, {
      status: "RESOLVED",
    }),
};
