"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  WORKFLOW_LABELS,
  WORKFLOW_TRANSITIONS,
  WorkflowStatus,
} from "@/lib/catalog";
import { WorkflowBadge } from "./WorkflowBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * زر تغيير حالة النشر (Draft/Pending/Published/Archived) مع تأكيد.
 * يعرض فقط الانتقالات المسموح بها.
 */
export function StatusControl({
  status,
  onChange,
}: {
  status: WorkflowStatus;
  onChange: (next: WorkflowStatus) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<WorkflowStatus | null>(null);
  const options = WORKFLOW_TRANSITIONS[status] ?? [];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1"
      >
        <WorkflowBadge status={status} />
        {options.length > 0 ? (
          <ChevronDown size={14} className="text-gray-400" />
        ) : null}
      </button>
      {open && options.length > 0 ? (
        <div className="absolute z-20 mt-1 min-w-[9rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {options.map((o) => (
            <button
              key={o}
              onMouseDown={(e) => {
                e.preventDefault();
                setTarget(o);
                setOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-right text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              ← {WORKFLOW_LABELS[o]}
            </button>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={target !== null}
        tone={target === "ARCHIVED" ? "warning" : "brand"}
        title="تغيير الحالة"
        message={
          target ? (
            <>
              هل تريد تغيير الحالة إلى <b>{WORKFLOW_LABELS[target]}</b>؟
              {target === "PUBLISHED"
                ? " سيصبح العنصر مرئيًا في التطبيقات."
                : target === "ARCHIVED"
                  ? " لن يظهر للركاب بعد الآن لكن لن تتأثر الرحلات القديمة."
                  : ""}
            </>
          ) : (
            ""
          )
        }
        confirmLabel="تأكيد"
        onCancel={() => setTarget(null)}
        onConfirm={async () => {
          if (target) await onChange(target);
          setTarget(null);
        }}
      />
    </div>
  );
}
