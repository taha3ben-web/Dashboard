"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { money, num, dateTime } from "@/lib/format";
import { ArrowRight, Star, Car, Wallet as WalletIcon, FileText, MapPin } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

interface WalletTx {
  id: string;
  type: string;
  amount: number | string;
  balanceAfter: number | string;
  reason?: string | null;
  createdAt: string;
}
interface Wallet {
  id: string;
  balance: number | string;
  currency: string;
  updatedAt: string;
  transactions: WalletTx[];
}
interface Vehicle {
  id: string;
  make: string;
  model: string;
  year?: number | null;
  color?: string | null;
  plate: string;
  rideClass: string;
  isActive: boolean;
}
interface DriverDoc {
  id: string;
  type: string;
  url: string;
  status: string;
  note?: string | null;
  createdAt: string;
}
interface Trip {
  id: string;
  status: string;
  fare?: number | string | null;
  pickupAddress?: string | null;
  destAddress?: string | null;
  createdAt: string;
  completedAt?: string | null;
}
interface DriverDetail {
  id: string;
  status: string;
  statusMessage?: string | null;
  availability: string;
  rating: number;
  totalTrips: number;
  currentLat?: number | null;
  currentLng?: number | null;
  createdAt: string;
  user?: {
    name: string;
    phone: string;
    email?: string | null;
    status: string;
    avatarUrl?: string | null;
    createdAt: string;
  };
  city?: { name: string } | null;
  vehicles: Vehicle[];
  documents: DriverDoc[];
  trips: Trip[];
  wallet?: Wallet | null;
  earningsSummary?: {
    net: number;
    gross: number;
    commission: number;
    count: number;
  };
}

const DOC_LABELS: Record<string, string> = {
  LICENSE: "رخصة القيادة",
  ID_CARD: "بطاقة الهوية",
  INSURANCE: "التأمين",
  REGISTRATION: "بطاقة تسجيل المركبة",
  PROFILE_PHOTO: "الصورة الشخصية",
};

const RIDE_CLASS_LABELS: Record<string, string> = {
  ECONOMY: "اقتصادية",
  COMFORT: "مريحة",
  VAN: "عائلية",
  XL: "كبيرة",
};

export default function DriverDetailPage() {
  const { can } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  // الرسالة التي يتحكم بها الطاقم وتظهر للسائق في التطبيق مع قرار الحالة.
  const [statusMsg, setStatusMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const canManageDrivers = can("drivers.manage");
  const canReviewDocs = can("drivers.documents", "drivers.manage");

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/drivers/${id}`)
      .then((r) => {
        setDriver(r.data);
        setStatusMsg(r.data?.statusMessage ?? "");
      })
      .catch(() => setDriver(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function accountAction(action: string) {
    if (!canManageDrivers) return;
    setSaving(true);
    try {
      // نرسل الرسالة مع القرار لتظهر للسائق في شاشة الحالة داخل التطبيق.
      await api.patch(`/drivers/${id}/${action}`, {
        message: statusMsg.trim() || undefined,
      });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function reviewDoc(docId: string, status: "APPROVED" | "REJECTED") {
    if (!canReviewDocs) return;
    let note: string | undefined;
    if (status === "REJECTED") {
      note = window.prompt("سبب رفض الوثيقة (يظهر للسائق):") ?? undefined;
    }
    await api.patch(`/drivers/documents/${docId}/review`, { status, note });
    load();
  }

  if (loading) {
    return (
      <>
        <Topbar title="تفاصيل السائق" />
        <div className="p-6 text-gray-400">جارٍ التحميل...</div>
      </>
    );
  }
  if (!driver) {
    return (
      <>
        <Topbar title="تفاصيل السائق" />
        <div className="p-6 text-gray-400">لم يتم العثور على السائق.</div>
      </>
    );
  }

  const initials = (driver.user?.name ?? "؟").trim().charAt(0);

  return (
    <>
      <Topbar title="تفاصيل السائق" />
      <div className="space-y-6 p-6">
        {!canManageDrivers ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذا العرض للقراءة فقط بالنسبة لإدارة الحساب. تحتاج إلى صلاحية إدارة السائقين أو الوثائق لتنفيذ الأوامر الحساسة.
          </div>
        ) : null}

        <button
          onClick={() => router.push("/drivers")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand"
        >
          <ArrowRight size={16} /> عودة لقائمة السائقين
        </button>

        {/* رأس الملف */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center gap-4">
            {driver.user?.avatarUrl ? (
              <img
                src={driver.user.avatarUrl}
                alt=""
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-2xl font-bold text-brand">
                {initials}
              </div>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{driver.user?.name ?? "-"}</h2>
                <StatusBadge status={driver.status} />
                <StatusBadge status={driver.availability} />
              </div>
              <p className="mt-1 text-sm text-gray-500">{driver.user?.phone}</p>
              {driver.user?.email ? (
                <p className="text-sm text-gray-500">{driver.user.email}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Star size={14} className="text-amber-500" />
                  {driver.rating?.toFixed(1)}
                </span>
                <span>الرحلات: {num(driver.totalTrips)}</span>
                {driver.city?.name ? (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {driver.city.name}
                  </span>
                ) : null}
                <span>انضم: {dateTime(driver.user?.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* رسالة الحالة + إجراءات الحساب (يتحكم بها الطاقم وتظهر للسائق في التطبيق) */}
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
            <label className="mb-1 block text-sm font-medium text-gray-500">
              رسالة تظهر للسائق في التطبيق (اختياري)
            </label>
            <textarea
              value={statusMsg}
              onChange={(e) => setStatusMsg(e.target.value)}
              rows={2}
              placeholder="مثال: تم قبول طلبك، مرحبًا بك في NOVA. — أو: الصور غير واضحة، يرجى إعادة رفع الوثائق."
              disabled={!canManageDrivers}
              className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-800"
            />
            {canManageDrivers ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={saving}
                  onClick={() => accountAction("approve")}
                  className="rounded-lg bg-green-500/10 px-3 py-1.5 text-sm text-green-500 disabled:opacity-50"
                >
                  قبول الطلب
                </button>
                <button
                  disabled={saving}
                  onClick={() => accountAction("reject")}
                  className="rounded-lg bg-red-500/10 px-3 py-1.5 text-sm text-red-500 disabled:opacity-50"
                >
                  رفض الطلب
                </button>
                <button
                  disabled={saving}
                  onClick={() => accountAction("suspend")}
                  className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-sm text-amber-500 disabled:opacity-50"
                >
                  تعليق
                </button>
                <button
                  disabled={saving}
                  onClick={() => accountAction("ban")}
                  className="rounded-lg bg-gray-500/10 px-3 py-1.5 text-sm text-gray-500 disabled:opacity-50"
                >
                  حظر
                </button>
              </div>
            ) : null}
            <p className="mt-2 text-xs text-gray-400">
              تُرسَل هذه الرسالة مع قرارك وتظهر للسائق فورًا في شاشة الحالة داخل
              التطبيق (قبول / رفض / انتظار).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* المحفظة */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <WalletIcon size={18} className="text-brand" />
              <h3 className="font-bold">المحفظة</h3>
            </div>
            <div className="mb-4 rounded-lg bg-brand/5 p-4">
              <p className="text-sm text-gray-500">الرصيد الحالي</p>
              <p className="text-2xl font-bold text-brand">
                {money(driver.wallet?.balance ?? 0)}
              </p>
            </div>
            <p className="mb-2 text-sm font-medium text-gray-500">
              آخر المعاملات
            </p>
            {driver.wallet?.transactions?.length ? (
              <div className="space-y-2">
                {driver.wallet.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm last:border-0 dark:border-gray-800"
                  >
                    <div>
                      <p className="font-medium">{tx.type}</p>
                      <p className="text-xs text-gray-400">
                        {dateTime(tx.createdAt)}
                      </p>
                    </div>
                    <span className="font-bold">{money(tx.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">لا توجد معاملات بعد.</p>
            )}
          </div>

          {/* المركبة + الأرباح */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <Car size={18} className="text-brand" />
              <h3 className="font-bold">المركبة</h3>
            </div>
            {driver.vehicles?.length ? (
              driver.vehicles.map((v) => (
                <div key={v.id} className="space-y-1 text-sm">
                  <Row label="الطراز" value={`${v.make} ${v.model}`} />
                  <Row label="اللون" value={v.color ?? "-"} />
                  <Row label="اللوحة" value={v.plate} />
                  <Row label="السنة" value={v.year ? String(v.year) : "-"} />
                  <Row
                    label="الفئة"
                    value={RIDE_CLASS_LABELS[v.rideClass] ?? v.rideClass}
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">لم تُسجَّل مركبة بعد.</p>
            )}

            {driver.earningsSummary ? (
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <p className="mb-2 text-sm font-medium text-gray-500">
                  ملخص الأرباح
                </p>
                <Row
                  label="صافي أرباح السائق"
                  value={money(driver.earningsSummary.net)}
                />
                <Row
                  label="عمولة الشركة"
                  value={money(driver.earningsSummary.commission)}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* الوثائق */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={18} className="text-brand" />
            <h3 className="font-bold">الوثائق</h3>
          </div>
          {driver.documents?.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {driver.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
                >

                  <a href={doc.url} target="_blank" rel="noreferrer">
                    <img
                      src={doc.url}
                      alt={doc.type}
                      className="h-40 w-full bg-gray-100 object-cover dark:bg-gray-800"
                    />
                  </a>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {DOC_LABELS[doc.type] ?? doc.type}
                      </span>
                      <StatusBadge status={doc.status} />
                    </div>
                    {canReviewDocs ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => reviewDoc(doc.id, "APPROVED")}
                          className="flex-1 rounded bg-green-500/10 px-2 py-1 text-xs text-green-500"
                        >
                          قبول
                        </button>
                        <button
                          onClick={() => reviewDoc(doc.id, "REJECTED")}
                          className="flex-1 rounded bg-red-500/10 px-2 py-1 text-xs text-red-500"
                        >
                          رفض
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">عرض فقط</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">لم يرفع السائق أي وثائق بعد.</p>
          )}
        </div>

        {/* آخر الرحلات */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 font-bold">آخر الرحلات</h3>
          {driver.trips?.length ? (
            <div className="space-y-2">
              {driver.trips.map((tr) => (
                <div
                  key={tr.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm last:border-0 dark:border-gray-800"
                >
                  <div>
                    <p className="font-medium">{tr.destAddress ?? "-"}</p>
                    <p className="text-xs text-gray-400">
                      {dateTime(tr.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{money(tr.fare ?? 0)}</span>
                    <StatusBadge status={tr.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">لا توجد رحلات بعد.</p>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
