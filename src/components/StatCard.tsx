import type { ReactNode } from "react";
import clsx from "clsx";

interface Props {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: "brand" | "green" | "amber" | "red" | "blue";
  hint?: string;
}

const ACCENTS = {
  brand: {
    icon: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    line: "from-indigo-500 to-violet-500",
  },
  green: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    line: "from-emerald-400 to-green-600",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    line: "from-amber-400 to-orange-500",
  },
  red: {
    icon: "bg-red-500/10 text-red-600 dark:text-red-300",
    line: "from-red-400 to-rose-600",
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    line: "from-blue-400 to-cyan-600",
  },
} as const;

export function StatCard({
  label,
  value,
  icon,
  accent = "brand",
  hint,
}: Props) {
  const tone = ACCENTS[accent];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      <div
        className={clsx(
          "absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l opacity-80",
          tone.line,
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-500 dark:text-gray-400">
            {label}
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {value}
          </div>
          {hint ? (
            <div className="mt-1 text-xs text-slate-400">{hint}</div>
          ) : null}
        </div>
        {icon ? (
          <span
            className={clsx(
              "shrink-0 rounded-xl p-2.5 transition-transform group-hover:scale-105",
              tone.icon,
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}
