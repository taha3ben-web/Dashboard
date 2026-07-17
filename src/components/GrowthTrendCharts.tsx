"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/lib/format";

export interface GrowthTrendPoint {
  label: string;
  trips: number;
  revenue: number;
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #8883",
  background: "#111827",
  color: "#fff",
};
const axisTickStyle = { fontSize: 11 };
const activeDotStyle = { r: 5 };

export function GrowthTrendCharts({
  data,
  currency,
}: {
  data: GrowthTrendPoint[];
  currency?: string;
}) {
  if (!data.length) {
    return <div className="flex h-72 items-center justify-center rounded-xl border border-dashed text-sm text-gray-500">لا توجد بيانات زمنية للفترة المحددة.</div>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="الرحلات اليومية">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="growthTrips" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#8883" />
            <XAxis dataKey="label" tick={axisTickStyle} minTickGap={24} />
            <YAxis tick={axisTickStyle} allowDecimals={false} width={42} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [Number(value ?? 0).toLocaleString(), "الرحلات"]} />
            <Area type="monotone" dataKey="trips" name="الرحلات" stroke="#6366f1" fill="url(#growthTrips)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="إيراد المنصة اليومي (Ledger)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#8883" />
            <XAxis dataKey="label" tick={axisTickStyle} minTickGap={24} />
            <YAxis tick={axisTickStyle} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [money(Number(value ?? 0), currency), "إيراد المنصة"]} />
            <Legend />
            <Line type="monotone" dataKey="revenue" name="إيراد المنصة" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={activeDotStyle} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="h-80 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><h3 className="mb-3 text-sm font-semibold">{title}</h3><div className="h-64">{children}</div></section>;
}
