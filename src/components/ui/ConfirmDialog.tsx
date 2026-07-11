"use client";

import { ReactNode, useState } from "react";
import { AlertTriangle } from "lucide-react";
import clsx from "clsx";
import { Modal } from "./Modal";

type Tone = "danger" | "warning" | "brand";

/**
 * نافذة تأكيد قبل الإجراءات الحساسة (حذف/أرشفة/نشر).
 * تدعم حالة تحميل أثناء تنفيذ الإجراء وإظهار أخطاء الخادم.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setErr("");
    setLoading(true);
    try {
      await onConfirm();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? "تعذّر تنفيذ الإجراء";
      setErr(Array.isArray(msg) ? msg.join("، ") : String(msg));
    } finally {
      setLoading(false);
    }
  }

  const btn = {
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-amber-600 hover:bg-amber-700",
    brand: "bg-brand hover:bg-brand-dark",
  }[tone];

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onCancel}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle
            size={18}
            className={clsx(
              tone === "danger" && "text-red-500",
              tone === "warning" && "text-amber-500",
              tone === "brand" && "text-brand",
            )}
          />
          {title}
        </span>
      }
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-gray-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={run}
            disabled={loading}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50",
              btn,
            )}
          >
            {loading ? "جارٍ..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-gray-600 dark:text-gray-300">{message}</div>
      {err ? <p className="mt-3 text-xs text-red-500">{err}</p> : null}
    </Modal>
  );
}
