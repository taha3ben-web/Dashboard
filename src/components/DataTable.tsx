import { Inbox, Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  empty = "لا توجد بيانات",
  loading = false,
  emptyIcon: EmptyIcon = Inbox,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  loading?: boolean;
  emptyIcon?: LucideIcon;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      <div className="nova-scrollbar overflow-x-auto">
        <table className="min-w-full text-right text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/90 text-slate-500 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wide ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Loader2
                      size={24}
                      className="animate-spin text-indigo-500"
                    />
                    <span>جارٍ تحميل البيانات...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <span className="rounded-2xl bg-slate-100 p-3 dark:bg-gray-800">
                      <EmptyIcon size={24} />
                    </span>
                    <span className="font-medium">{empty}</span>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id ?? index}
                  className="transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`whitespace-nowrap px-4 py-3.5 text-slate-700 dark:text-gray-200 ${column.className ?? ""}`}
                    >
                      {column.render
                        ? column.render(row)
                        : (row as Record<string, ReactNode>)[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
