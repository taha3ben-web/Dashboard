"use client";

import { Loader2, ShieldAlert, X } from "lucide-react";
import type { PaymentAction } from "@/lib/payment";
import { PAYMENT_ACTION_LABELS } from "@/lib/payment";

export interface PaymentActionDraft {
  action: PaymentAction;
  paymentId: string;
  paymentLabel: string;
}

export function PaymentActionDialog({
  draft,
  reference,
  reason,
  busy,
  onReferenceChange,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  draft: PaymentActionDraft | null;
  reference: string;
  reason: string;
  busy: boolean;
  onReferenceChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!draft) return null;
  const requiresReason = draft.action === "refund" || draft.action === "cancel";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-action-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="rounded-xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <ShieldAlert size={22} />
            </span>
            <div>
              <h2 id="payment-action-title" className="text-lg font-bold">
                {PAYMENT_ACTION_LABELS[draft.action]}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                إجراء مالي حساس على الدفعة {draft.paymentLabel}. راجع البيانات قبل التأكيد.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium">
            مرجع المزوّد أو العملية
            <input
              value={reference}
              onChange={(event) => onReferenceChange(event.target.value)}
              maxLength={100}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-950"
              placeholder="اختياري"
            />
          </label>
          <label className="block text-sm font-medium">
            السبب {requiresReason ? <span className="text-red-500">*</span> : null}
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              maxLength={500}
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-950"
              placeholder={requiresReason ? "سبب واضح مطلوب للتدقيق" : "ملاحظة اختيارية للتدقيق"}
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-gray-700"
          >
            تراجع
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || (requiresReason && !reason.trim())}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              draft.action === "refund"
                ? "bg-amber-600 hover:bg-amber-700"
                : draft.action === "cancel"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-brand hover:bg-brand-dark"
            }`}
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : null}
            {busy ? "جارٍ التنفيذ..." : "تأكيد الإجراء"}
          </button>
        </div>
      </div>
    </div>
  );
}
