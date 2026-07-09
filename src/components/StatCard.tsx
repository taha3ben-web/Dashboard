import { ReactNode } from "react";
import clsx from "clsx";

interface Props {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: "brand" | "green" | "amber" | "red" | "blue";
}

const ACCENTS: Record<string, string> = {
  brand: "bg-brand/10 text-brand",
  green: "bg-green-500/10 text-green-500",
  amber: "bg-amber-500/10 text-amber-500",
  red: "bg-red-500/10 text-red-500",
  blue: "bg-blue-500/10 text-blue-500",
};

export function StatCard({ label, value, icon, accent = "brand" }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {label}
        </span>
        {icon ? (
          <span className={clsx("rounded-lg p-2", ACCENTS[accent])}>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
