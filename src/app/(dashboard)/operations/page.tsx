"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Database,
  RefreshCcw,
  Ticket,
  Wallet,
  Wifi,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";

interface HealthCheck {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

interface ComplaintRow {
  id: string;
  status: string;
  message: string;
  createdAt: string;
  fromUser?: { name?: string; phone?: string };
  againstUser?: { name?: string; phone?: string } | null;
}

interface WithdrawalRow {
  id: string;
  amount: number;
  status: string;
  note?: string | null;
  createdAt: string;
  user?: { name?: string; phone?: string };
}

interface TripRow {
  id: string;
  status: string;
  createdAt: string;
  passenger?: { name?: string };
  driver?: { user?: { name?: string } } | null;
}

interface OperationsResponse {
  ts: string;
  uptimeSec: number;
  memory: { rssMB: number; heapUsedMB: number; heapTotalMB: number };
  health: { db: HealthCheck; redis: HealthCheck };
  queues: {
    driversWithGeo: number;
    onlineDrivers: number;
    busyDrivers: number;
    activeTrips: number;
    openTickets: number;
    openComplaints: number;
    pendingWithdrawals: number;
  };
  recentComplaints: ComplaintRow[];
  recentWithdrawals: WithdrawalRow[];
  recentTrips: TripRow[];
}

function HealthBadge({ check }: { check?: HealthCheck }) {
  return (
    <span
      className={
        check?.ok
          ? "rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-600"
          : "rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-600"
      }
    >
      {check?.ok ? "سليم" : "متأثر"}
    </span>
  );
}

export default function OperationsPage() {
  const [data, setData] = useState<OperationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get("/dashboard/operations")
      .then((response) => setData(response.data ?? null))
      .catch((loadError) => {
        setData(null);
        setError(getApiErrorMessage(loadError, "تعذّر تحميل مركز العمليات"));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const complaintColumns: Column<ComplaintRow>[] = [
    {
      key: "fromUser",
      header: "المُبلّغ",
      render: (row) => (
        <div>
          <div className="font-medium">{row.fromUser?.name ?? "-"}</div>
          <div className="text-xs text-gray-500">{row.fromUser?.phone ?? "-"}</div>
        </div>
      ),
    },
    { key: "againstUser", header: "ضد", render: (row) => row.againstUser?.name ?? "-" },
    { key: "status", header: "الحالة", render: (row) => <StatusBadge status={row.status} /> },
    { key: "message", header: "الشكوى", render: (row) => row.message },
    { key: "createdAt", header: "الوقت", render: (row) => dateTime(row.createdAt) },
  ];

  const withdrawalColumns: Column<WithdrawalRow>[] = [
    {
      key: "user",
      header: "السائق",
      render: (row) => (
        <div>
          <div className="font-medium">{row.user?.name ?? "-"}</div>
          <div className="text-xs text-gray-500">{row.user?.phone ?? "-"}</div>
        </div>
      ),
    },
    { key: "amount", header: "المبلغ", render: (row) => num(row.amount) },
    { key: "status", header: "الحالة", render: (row) => <StatusBadge status={row.status} /> },
    { key: "note", header: "الملاحظة", render: (row) => row.note ?? "-" },
    { key: "createdAt", header: "الوقت", render: (row) => dateTime(row.createdAt) },
  ];

  const tripColumns: Column<TripRow>[] = [
    { key: "id", header: "الرحلة", render: (row) => row.id.slice(0, 8) },
    { key: "passenger", header: "الراكب", render: (row) => row.passenger?.name ?? "-" },
    { key: "driver", header: "السائق", render: (row) => row.driver?.user?.name ?? "-" },
    { key: "status", header: "الحالة", render: (row) => <StatusBadge status={row.status} /> },
    { key: "createdAt", header: "الوقت", render: (row) => dateTime(row.createdAt) },
  ];

  return (
    <>
      <Topbar title="العمليات والمراقبة" />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <div className="text-sm text-gray-500">آخر تحديث</div>
            <div className="mt-1 text-sm font-medium">{dateTime(data?.ts)}</div>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            تحديث
          </button>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20">{error}</div> : null}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="رحلات نشطة" value={num(data?.queues.activeTrips)} icon={<Activity size={18} />} accent="green" />
          <StatCard label="سائقون أونلاين" value={num(data?.queues.onlineDrivers)} icon={<Wifi size={18} />} accent="blue" />
          <StatCard label="شكاوى مفتوحة" value={num(data?.queues.openComplaints)} icon={<AlertTriangle size={18} />} accent="red" />
          <StatCard label="سحوبات معلقة" value={num(data?.queues.pendingWithdrawals)} icon={<Wallet size={18} />} accent="amber" />
          <StatCard label="تذاكر مفتوحة" value={num(data?.queues.openTickets)} icon={<Ticket size={18} />} accent="amber" />
          <StatCard label="سائقون مشغولون" value={num(data?.queues.busyDrivers)} icon={<Activity size={18} />} accent="green" />
          <StatCard label="إحداثيات حيّة" value={num(data?.queues.driversWithGeo)} icon={<Wifi size={18} />} accent="blue" />
          <StatCard label="زمن التشغيل (ث)" value={num(data?.uptimeSec)} icon={<Database size={18} />} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">صحة البنية</h2>
              <div className="text-xs text-gray-500">الذاكرة RSS: {num(data?.memory.rssMB)} MB</div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <div>
                  <div className="font-medium">قاعدة البيانات</div>
                  <div className="text-xs text-gray-500">{data?.health.db.latencyMs ? `${num(data.health.db.latencyMs)} ms` : data?.health.db.error ?? "-"}</div>
                </div>
                <HealthBadge check={data?.health.db} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <div>
                  <div className="font-medium">Redis</div>
                  <div className="text-xs text-gray-500">{data?.health.redis.latencyMs ? `${num(data.health.redis.latencyMs)} ms` : data?.health.redis.error ?? "-"}</div>
                </div>
                <HealthBadge check={data?.health.redis} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <div className="text-xs text-gray-500">Heap Used</div>
                  <div className="mt-1 text-lg font-bold">{num(data?.memory.heapUsedMB)} MB</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <div className="text-xs text-gray-500">Heap Total</div>
                  <div className="mt-1 text-lg font-bold">{num(data?.memory.heapTotalMB)} MB</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold">مؤشرات التشغيل الفوري</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="رحلات نشطة" value={data?.queues.activeTrips} />
              <Metric label="تذاكر مفتوحة" value={data?.queues.openTickets} />
              <Metric label="شكاوى مفتوحة" value={data?.queues.openComplaints} />
              <Metric label="سحوبات معلقة" value={data?.queues.pendingWithdrawals} />
              <Metric label="سائقون أونلاين" value={data?.queues.onlineDrivers} />
              <Metric label="سائقون مشغولون" value={data?.queues.busyDrivers} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <h2 className="mb-3 font-bold">أحدث الشكاوى</h2>
            <DataTable columns={complaintColumns} rows={data?.recentComplaints ?? []} empty="لا توجد شكاوى حديثة" />
          </div>
          <div>
            <h2 className="mb-3 font-bold">أحدث السحوبات</h2>
            <DataTable columns={withdrawalColumns} rows={data?.recentWithdrawals ?? []} empty="لا توجد سحوبات حديثة" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-bold">أحدث الرحلات</h2>
          <DataTable columns={tripColumns} rows={data?.recentTrips ?? []} empty="لا توجد رحلات حديثة" />
        </section>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-bold">{num(value)}</div>
    </div>
  );
}
