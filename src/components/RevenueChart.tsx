"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface ChartPoint {
  label: string;
  value: number;
}

const tickStyle = { fontSize: 12 };
const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #8883",
  background: "#111827",
  color: "#fff",
};

/**
 * مخطط إيرادات بسيط (مساحة) — يتكيف مع الوضع الداكن/الفاتح.
 */
export function RevenueChart({
  data,
  height = 260,
}: {
  data: ChartPoint[];
  height?: number;
}) {
  const containerStyle = { height };
  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      style={containerStyle}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#8883" />
          <XAxis dataKey="label" tick={tickStyle} />
          <YAxis tick={tickStyle} width={48} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            fill="url(#rev)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
