"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import clsx from "clsx";
import { WORKFLOW_LABELS, WorkflowStatus } from "@/lib/catalog";
import { Toggle } from "@/components/ui/Toggle";

export interface SortOption {
  value: string;
  label: string;
}

/**
 * شريط أدوات الجدول: بحث (مؤجّل) + فرز + تصفية بالحالة + خيارات الأرشفة/النشط.
 */
export function TableToolbar({
  search,
  onSearch,
  sortBy,
  sortOrder,
  onSort,
  sortOptions,
  status,
  onStatus,
  showStatus = true,
  activeOnly,
  onActiveOnly,
  includeDeleted,
  onIncludeDeleted,
  onReload,
  extra,
}: {
  search: string;
  onSearch: (v: string) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (by: string, order: "asc" | "desc") => void;
  sortOptions: SortOption[];
  status?: string;
  onStatus?: (v: string) => void;
  showStatus?: boolean;
  activeOnly?: boolean;
  onActiveOnly?: (v: boolean) => void;
  includeDeleted?: boolean;
  onIncludeDeleted?: (v: boolean) => void;
  onReload: () => void;
  extra?: React.ReactNode;
}) {
  const [local, setLocal] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(search);
  }, [search]);

  function onInput(v: string) {
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(v), 350);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-3 dark:border-gray-800">
      <div className="relative min-w-[12rem] flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={local}
          onChange={(e) => onInput(e.target.value)}
          placeholder="بحث..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-9 pl-3 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      {sortOptions.length > 0 ? (
        <select
          value={sortBy}
          onChange={(e) => onSort(e.target.value, sortOrder)}
          className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">الترتيب الافتراضي</option>
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}

      {sortBy ? (
        <button
          onClick={() => onSort(sortBy, sortOrder === "asc" ? "desc" : "asc")}
          className="rounded-lg border border-gray-300 px-2 py-2 text-xs dark:border-gray-700"
          title="عكس الترتيب"
        >
          {sortOrder === "asc" ? "↑ تصاعدي" : "↓ تنازلي"}
        </button>
      ) : null}

      {showStatus && onStatus ? (
        <select
          value={status ?? ""}
          onChange={(e) => onStatus(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">كل الحالات</option>
          {(Object.keys(WORKFLOW_LABELS) as WorkflowStatus[]).map((s) => (
            <option key={s} value={s}>
              {WORKFLOW_LABELS[s]}
            </option>
          ))}
        </select>
      ) : null}

      {extra}

      <div className="flex items-center gap-3">
        {onActiveOnly ? (
          <Toggle
            checked={!!activeOnly}
            onChange={onActiveOnly}
            label="النشط فقط"
          />
        ) : null}
        {onIncludeDeleted ? (
          <Toggle
            checked={!!includeDeleted}
            onChange={onIncludeDeleted}
            label="المؤرشف"
          />
        ) : null}
      </div>

      <button
        onClick={onReload}
        className={clsx(
          "rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800",
        )}
        title="تحديث"
      >
        <RefreshCw size={16} />
      </button>
    </div>
  );
}
