"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

/** شريط ترقيم الصفحات (RTL) مع عداد النتائج واختيار حجم الصفحة. */
export function Pagination({
  page,
  pages,
  total,
  limit,
  onPage,
  onLimit,
}: {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
  onLimit?: (l: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
      <div className="flex items-center gap-2 text-gray-500">
        <span>
          إجمالي: <b className="text-gray-800 dark:text-gray-200">{total}</b>
        </span>
        {onLimit ? (
          <select
            value={limit}
            onChange={(e) => onLimit(Number(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / صفحة
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-gray-300 p-1.5 disabled:opacity-40 dark:border-gray-700"
          aria-label="السابق"
        >
          <ChevronRight size={16} />
        </button>
        <span className="px-2 text-gray-600 dark:text-gray-300">
          {page} / {Math.max(pages, 1)}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className={clsx(
            "rounded-lg border border-gray-300 p-1.5 disabled:opacity-40 dark:border-gray-700",
          )}
          aria-label="التالي"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  );
}
