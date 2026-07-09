"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { RevenueChart, ChartPoint } from "@/components/RevenueChart";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { money, num, dateTime } from "@/lib/format";
import {
  Car,
  Users,
  Route,
  Activity,
  XCircle,
  Wifi,
  Briefcase,
  DollarSign,
} from "lucide-react";
import type { MapDriver } from "@/components/LiveMap";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

interface Summary {
  driversCount: number;
  passengersCount: number;
  tripsToday: number;
  activeTrips: number;
  cancelledToday: number;
  onlineDrivers: number;
  busyDrivers: number;
}

interface Earnings {
  totalCompany: number;
  totalDriverPayouts: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
}

interface Trip {
  id: string;
  status: string;
  fare?: number;
  createdAt: string;
  passenger?: { name: string };
}

export default function DashboardHome() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<MapDriver[]>([]);

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then((r) => setSummary(r.data))
      .catch(() => {});
    api
      .get("/dashboard/earnings")
      .then((r) => setEarnings(r.data))
      .catch(() => {});
    api
      .get("/dashboard/latest")
      .then((r) => setTrips(r.data.trips ?? []))
      .catch(() => {});
    api
      .get("/dashboard/live-map")
      .then((r) => setDrivers(r.data.drivers ?? []))
      .catch(() => {});

    const socket = getSocket();
    socket.on("driver:moved", (p: MapDriver) => {
      setDrivers((prev) => {
        const rest = prev.filter((d) => d.id !== p.id);
        return [...rest, p];
      });
    });
    return () => {
      socket.off("driver:moved");
    };
  }, []);

  const revenueData: ChartPoint[] = earnings
    ? [
        { label: "اليوم", value: Number(earnings.revenueToday) },
        { label: "الأسبوع", value: Number(earnings.revenueWeek) },
        { label: "الشهر", value: Number(earnings.revenueMonth) },
      ]
    : [];

  const columns: Column<Trip>[] = [
    { key: "id", header: "رقم", render: (t) => t.id.slice(0, 8) },
    {
      key: "passenger",
      header: "الراكب",
      render: (t) => t.passenger?.name ?? "-",
    },
    {
      key: "status",
      header: "الحالة",
      render: (t) => <StatusBadge status={t.status} />,
    },
    { key: "fare", header: "التكلفة", render: (t) => money(t.fare) },
    { key: "createdAt", header: "الوقت", render: (t) => dateTime(t.createdAt) },
  ];

  return (
    <>
      <Topbar title="لوحة التحكم" />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="السائقون"
            value={num(summary?.driversCount)}
            icon={<Car size={18} />}
          />
          <StatCard
            label="الركاب"
            value={num(summary?.passengersCount)}
            icon={<Users size={18} />}
            accent="blue"
          />
          <StatCard
            label="رحلات اليوم"
            value={num(summary?.tripsToday)}
            icon={<Route size={18} />}
            accent="green"
          />
          <StatCard
            label="رحلات نشطة"
            value={num(summary?.activeTrips)}
            icon={<Activity size={18} />}
            accent="amber"
          />
          <StatCard
            label="ملغاة اليوم"
            value={num(summary?.cancelledToday)}
            icon={<XCircle size={18} />}
            accent="red"
          />
          <StatCard
            label="سائقون متصلون"
            value={num(summary?.onlineDrivers)}
            icon={<Wifi size={18} />}
            accent="green"
          />
          <StatCard
            label="سائقون مشغولون"
            value={num(summary?.busyDrivers)}
            icon={<Briefcase size={18} />}
            accent="amber"
          />
          <StatCard
            label="أرباح الشركة"
            value={money(earnings?.totalCompany)}
            icon={<DollarSign size={18} />}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
            <h2 className="mb-4 font-bold">
              الإيرادات (اليوم / الأسبوع / الشهر)
            </h2>
            <RevenueChart data={revenueData} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-bold">الخريطة الحية</h2>
            <LiveMap drivers={drivers} height="280px" />
            <p className="mt-2 text-sm text-gray-500">
              سائقون متصلون الآن: {num(drivers.length)}
            </p>
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-bold">آخر الرحلات</h2>
          <DataTable columns={columns} rows={trips} />
        </div>
      </div>
    </>
  );
}
