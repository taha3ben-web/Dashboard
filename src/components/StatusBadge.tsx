import clsx from "clsx";

/**
 * شارة حالة موحّدة لكل حالات النظام (سائق، رحلة، دفع، سحب، تذكرة، شكوى).
 */
const STYLES: Record<string, string> = {
  // إيجابي / مكتمل
  APPROVED: "bg-green-500/10 text-green-500",
  ACTIVE: "bg-green-500/10 text-green-500",
  COMPLETED: "bg-green-500/10 text-green-500",
  FUNDED: "bg-green-500/10 text-green-500",
  PAID: "bg-green-500/10 text-green-500",
  RESOLVED: "bg-green-500/10 text-green-500",
  CLOSED: "bg-gray-500/10 text-gray-500",
  // قيد الانتظار / جارٍ
  PENDING: "bg-amber-500/10 text-amber-500",
  REVIEWING: "bg-amber-500/10 text-amber-500",
  OPEN: "bg-blue-500/10 text-blue-500",
  SEARCHING: "bg-blue-500/10 text-blue-500",
  ACCEPTED: "bg-blue-500/10 text-blue-500",
  ARRIVING: "bg-blue-500/10 text-blue-500",
  IN_PROGRESS: "bg-blue-500/10 text-blue-500",
  ONLINE: "bg-green-500/10 text-green-500",
  ON_TRIP: "bg-blue-500/10 text-blue-500",
  // سلبي
  SUSPENDED: "bg-amber-500/10 text-amber-500",
  REJECTED: "bg-red-500/10 text-red-500",
  BANNED: "bg-red-500/10 text-red-500",
  CANCELLED: "bg-red-500/10 text-red-500",
  OFFLINE: "bg-gray-500/10 text-gray-500",
};

const LABELS: Record<string, string> = {
  APPROVED: "مقبول",
  ACTIVE: "نشط",
  COMPLETED: "مكتملة",
  FUNDED: "تم الشحن",
  PAID: "مدفوع",
  RESOLVED: "تم الحل",
  CLOSED: "مغلقة",
  PENDING: "قيد الانتظار",
  REVIEWING: "قيد المراجعة",
  OPEN: "مفتوحة",
  SEARCHING: "بحث",
  ACCEPTED: "مقبولة",
  ARRIVING: "في الطريق",
  IN_PROGRESS: "جارية",
  ONLINE: "متصل",
  ON_TRIP: "في رحلة",
  SUSPENDED: "معلّق",
  REJECTED: "مرفوض",
  BANNED: "محظور",
  CANCELLED: "ملغاة",
  OFFLINE: "غير متصل",
};

export function StatusBadge({ status }: { status: string }) {
  const key = (status ?? "").toUpperCase();
  return (
    <span
      className={clsx(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[key] ?? "bg-gray-500/10 text-gray-500",
      )}
    >
      {LABELS[key] ?? status ?? "-"}
    </span>
  );
}
