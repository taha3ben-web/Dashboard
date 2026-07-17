"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Route,
  ShieldAlert,
  Wallet,
  XCircle,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { GrowthTrendCharts } from "@/components/GrowthTrendCharts";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { dateTime, money, num } from "@/lib/format";

interface Overview {
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  completionRate: number;
  newPassengers: number;
  newDrivers: number;
}

interface Revenue {
  companyEarnings: number;
  driverNet: number;
  commissions: number;
  paymentsCollected: number;
  withdrawalsPaid: number;
}

interface PaymentOps {
  totalCount: number;
  totalAmount: number;
  capturedAmount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
}

interface SettlementOps {
  completedTrips: number;
  settledTrips: number;
  unsettledTrips: number;
  failedSettlements: number;
  settlementAttempts: number;
}

interface WithdrawalOps {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
}

interface TimeseriesPoint {
  day: string;
  trips: number;
  revenue: number;
}

interface TopDriver {
  driverId: string;
  name: string;
  phone: string;
  rating: number;
  trips: number;
  netEarnings: number;
}

interface TopCity {
  cityId?: string | null;
  name: string;
  trips: number;
}

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [paymentOps, setPaymentOps] = useState<PaymentOps | null>(null);
  const [settlementOps, setSettlementOps] = useState<SettlementOps | null>(null);
  const [withdrawalOps, setWithdrawalOps] = useState<WithdrawalOps | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [topDrivers, setTopDrivers] = useState<TopDriver[]>([]);
  const [topCities, setTopCities] = useState<TopCity[]>([]);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const params = useMemo(() => {
    const next: Record<string, string> = {};
    if (from) next.from = new Date(`${from}T00:00:00.000Z`).toISOString();
    if (to) next.to = new Date(`${to}T23:59:59.999Z`).toISOString();
    return next;
  }, [from, to]);

  const load = useCallback(async (manual = false) => {
    setError("");
    setErrorCode(undefined);
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const [
        overviewResponse,
        revenueResponse,
        paymentOpsResponse,
        settlementOpsResponse,
        withdrawalOpsResponse,
        timeseriesResponse,
        topDriversResponse,
        topCitiesResponse,
      ] = await Promise.all([
      api.get("/statistics/overview", { params }),
      api.get("/statistics/revenue", { params }),
      api.get("/statistics/payment-ops", { params }),
      api.get("/statistics/settlement-ops", { params }),
      api.get("/statistics/withdrawal-ops", { params }),
      api.get("/statistics/timeseries", { params }),
      api.get("/statistics/top-drivers", { params }),
      api.get("/statistics/top-cities", { params }),
      ]);
      setOverview(overviewResponse.data ?? null);
      setRevenue(revenueResponse.data ?? null);
      setPaymentOps(paymentOpsResponse.data ?? null);
      setSettlementOps(settlementOpsResponse.data ?? null);
      setWithdrawalOps(withdrawalOpsResponse.data ?? null);
      setTimeseries(timeseriesResponse.data ?? []);
      setTopDrivers(topDriversResponse.data ?? []);
      setTopCities(topCitiesResponse.data ?? []);
    } catch (loadError) {
      setOverview(null);
      setRevenue(null);
      setPaymentOps(null);
      setSettlementOps(null);
      setWithdrawalOps(null);
      setTimeseries([]);
      setTopDrivers([]);
      setTopCities([]);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل التقارير"));
      setErrorCode(getApiErrorCode(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const chartData = useMemo(
    () => timeseries.map((row) => ({ label: new Intl.DateTimeFormat("ar-DZ", { month: "short", day: "numeric" }).format(new Date(row.day)), trips: row.trips, revenue: row.revenue })),
    [timeseries],
  );

  return (
    <>
      <Topbar title="التقارير" />
      <div className="space-y-6 p-4 sm:p-6">
        <section className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <div className="mb-1 text-xs text-gray-500">من</div>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-gray-500">إلى</div>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <button
            onClick={() => void load(true)}
            disabled={loading || refreshing}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {refreshing ? "جارٍ التحديث..." : "تطبيق وتحديث"}
          </button>
          <button
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
          >
            إعادة ضبط
          </button>
        </section>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"><div>{error}</div>{errorCode ? <div className="mt-1 font-mono text-xs">code: {errorCode}</div> : null}</div> : null}
        {loading ? <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">جارٍ تحميل مؤشرات النمو والتحليلات...</div> : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">نظرة عامة تشغيلية</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="الرحلات" value={num(overview?.totalTrips)} icon={<Route size={18} />} />
            <StatCard label="المكتملة" value={num(overview?.completedTrips)} icon={<CheckCircle2 size={18} />} accent="green" />
            <StatCard label="الملغاة" value={num(overview?.cancelledTrips)} icon={<XCircle size={18} />} accent="amber" />
            <StatCard label="معدل الإكمال" value={`${num(overview?.completionRate)}%`} icon={<CalendarDays size={18} />} accent="brand" />
            <StatCard label="ركاب جدد" value={num(overview?.newPassengers)} icon={<Route size={18} />} accent="blue" />
            <StatCard label="سائقون جدد" value={num(overview?.newDrivers)} icon={<Route size={18} />} accent="green" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">إيرادات وتشغيل مالي</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="إيراد الشركة" value={money(revenue?.companyEarnings)} icon={<CircleDollarSign size={18} />} accent="brand" />
            <StatCard label="صافي السائقين" value={money(revenue?.driverNet)} icon={<Wallet size={18} />} accent="blue" />
            <StatCard label="العمولات" value={money(revenue?.commissions)} icon={<CircleDollarSign size={18} />} accent="amber" />
            <StatCard label="المدفوعات المحصلة" value={money(revenue?.paymentsCollected)} icon={<CreditCard size={18} />} accent="green" />
            <StatCard label="السحوبات المدفوعة" value={money(revenue?.withdrawalsPaid)} icon={<Wallet size={18} />} accent="red" />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Panel title="عمليات الدفع">
            <MiniStat label="إجمالي العمليات" value={num(paymentOps?.totalCount)} />
            <MiniStat label="القيمة الكلية" value={money(paymentOps?.totalAmount)} />
            <MiniStat label="المحصلة" value={money(paymentOps?.capturedAmount)} />
            <MiniStat label="معلّقة" value={num(paymentOps?.pendingCount)} />
            <MiniStat label="فاشلة" value={num(paymentOps?.failedCount)} />
            <MiniStat label="مستردة" value={num(paymentOps?.refundedCount)} />
          </Panel>

          <Panel title="تسوية الرحلات">
            <MiniStat label="رحلات مكتملة" value={num(settlementOps?.completedTrips)} />
            <MiniStat label="تمت تسويتها" value={num(settlementOps?.settledTrips)} />
            <MiniStat label="غير مسوّاة" value={num(settlementOps?.unsettledTrips)} />
            <MiniStat label="تسويات بها أخطاء" value={num(settlementOps?.failedSettlements)} />
            <MiniStat label="إجمالي المحاولات" value={num(settlementOps?.settlementAttempts)} />
          </Panel>

          <Panel title="السحوبات">
            <MiniStat label="إجمالي الطلبات" value={num(withdrawalOps?.totalCount)} />
            <MiniStat label="القيمة الكلية" value={money(withdrawalOps?.totalAmount)} />
            <MiniStat label="قيد الانتظار" value={num(withdrawalOps?.pendingCount)} />
            <MiniStat label="معتمدة" value={num(withdrawalOps?.approvedCount)} />
            <MiniStat label="مدفوعة" value={num(withdrawalOps?.paidCount)} />
            <MiniStat label="مرفوضة" value={num(withdrawalOps?.rejectedCount)} />
          </Panel>
        </section>

        <section className="space-y-3">
          <div><h2 className="text-lg font-semibold">اتجاه النمو اليومي</h2><p className="text-sm text-gray-500">إيراد المنصة معتمد من قيود Ledger المكتملة، والرحلات محسوبة حسب تاريخ إنشائها.</p></div>
          <GrowthTrendCharts data={chartData} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="السلسلة الزمنية اليومية">
            <SimpleTable
              headers={["اليوم", "الرحلات", "الإيراد"]}
              rows={timeseries.map((row) => [dateTime(row.day), num(row.trips), money(row.revenue)])}
              empty="لا توجد بيانات زمنية."
            />
          </Panel>

          <Panel title="أفضل السائقين">
            <SimpleTable
              headers={["الاسم", "الهاتف", "الرحلات", "صافي الأرباح"]}
              rows={topDrivers.map((row) => [row.name, row.phone, num(row.trips), money(row.netEarnings)])}
              empty="لا توجد بيانات للسائقين."
            />
          </Panel>
        </section>

        <section>
          <Panel title="أكثر المدن نشاطًا">
            <SimpleTable
              headers={["المدينة", "عدد الرحلات"]}
              rows={topCities.map((row) => [row.name, num(row.trips)])}
              empty="لا توجد بيانات للمدن."
            />
          </Panel>
        </section>
      </div>
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-b-0 dark:border-gray-800">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <div className="text-sm text-gray-500">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-right dark:border-gray-800">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium text-gray-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.join("-")}-${index}`} className="border-b border-gray-100 dark:border-gray-800">
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
