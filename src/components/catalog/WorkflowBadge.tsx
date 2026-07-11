"use client";

import clsx from "clsx";
import { WORKFLOW_LABELS, WorkflowStatus } from "@/lib/catalog";

const STYLES: Record<WorkflowStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  ARCHIVED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function WorkflowBadge({ status }: { status: WorkflowStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status] ?? STYLES.DRAFT,
      )}
    >
      {WORKFLOW_LABELS[status] ?? status}
    </span>
  );
}
