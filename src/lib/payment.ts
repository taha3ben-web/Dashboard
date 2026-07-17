export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CANCELED";

export type PaymentAction = "capture" | "refund" | "cancel";

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ["AUTHORIZED", "CAPTURED", "PAID", "FAILED", "CANCELED"],
  AUTHORIZED: ["CAPTURED", "PAID", "FAILED", "CANCELED"],
  CAPTURED: ["REFUNDED"],
  PAID: ["REFUNDED"],
  FAILED: ["PENDING"],
  REFUNDED: [],
  CANCELED: [],
};

export function availablePaymentActions(
  status: PaymentStatus,
  method: string,
): PaymentAction[] {
  const actions: PaymentAction[] = [];
  const captureTarget: PaymentStatus = method === "CARD" ? "CAPTURED" : "PAID";
  if (PAYMENT_TRANSITIONS[status].includes(captureTarget)) actions.push("capture");
  if (PAYMENT_TRANSITIONS[status].includes("CANCELED")) actions.push("cancel");
  if (PAYMENT_TRANSITIONS[status].includes("REFUNDED")) actions.push("refund");
  return actions;
}

export const PAYMENT_ACTION_LABELS: Record<PaymentAction, string> = {
  capture: "التقاط الدفعة",
  refund: "تنفيذ الاسترداد",
  cancel: "إلغاء الدفعة",
};
