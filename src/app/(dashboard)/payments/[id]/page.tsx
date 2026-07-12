"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import { dateTime, money } from "@/lib/format";

interface PaymentEvent {
  id: string;
  type: string;
  status?: string | null;
  provider?: string | null;
  reference?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

interface PaymentDetails {
  id: string;
  amount: number;
  method: string;
  provider: string;
  providerPaymentId?: string | null;
  providerStatus?: string | null;
  status: string;
  statusReason?: string | null;
  reference?: string | null;
  createdAt: string;
  authorizedAt?: string | null;
  capturedAt?: string | null;
  refundedAt?: string | null;
  canceledAt?: string | null;
  failedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  user: { name: string; phone: string };
  trip: { id: string; status: string; fare?: number | null; currency: string };
  events: PaymentEvent[];
}

function prettyJson(value: Record<string, unknown> | null | undefined): string {
  if (!value) return "{}";
  return JSON.stringify(value, null, 2);
}

export default function PaymentDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setError("");
    api
      .get(`/payments/${id}`)
      .then((response) => setPayment(response.data))
      .catch((loadError) => {
        setPayment(null);
        setError(loadError instanceof Error ? loadError.message : "تعذّر تحميل الدفعة");
      });
  }, [id]);

  const timestamps = useMemo(
    () => [
      ["أُنشئت", payment?.createdAt],
      ["تم التفويض", payment?.authorizedAt],
      ["تم الالتقاط", payment?.capturedAt],
      ["تم الاسترداد", payment?.refundedAt],
      ["تم الإلغاء", payment?.canceledAt],
      ["فشلت", payment?.failedAt],
    ].filter((entry): entry is [string, string] => Boolean(entry[1])),
    [payment],
  );

  return (
    <>
      <Topbar title="تفاصيل الدفعة" />
      <div className="space-y-6 p-6">
        <div>
          <Link href="/payments" className="text-sm text-brand hover:underline">
            ← العودة إلى قائمة المدفوعات
          </Link>
        </div>

        {error ? <div className="text-sm text-red-500">{error}</div> : null}
        {!payment && !error ? <div className="text-sm text-gray-500">جارٍ التحميل...</div> : null}

        {payment ? (
          <>
            <section className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="الحالة" value={payment.status} />
              <InfoCard label="المبلغ" value={money(payment.amount)} />
              <InfoCard label="الوسيلة" value={payment.method} />
              <InfoCard label="المزوّد" value={payment.provider} />
              <InfoCard label="حالة المزوّد" value={payment.providerStatus ?? "-"} />
              <InfoCard label="مرجع المزوّد" value={payment.providerPaymentId ?? "-"} mono />
              <InfoCard label="الراكب" value={`${payment.user.name} · ${payment.user.phone}`} />
              <InfoCard label="الرحلة" value={`${payment.trip.id} · ${payment.trip.status}`} mono />
            </section>

            {payment.statusReason ? (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <div className="font-medium">سبب الحالة</div>
                <div>{payment.statusReason}</div>
              </section>
            ) : null}

            <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-3 text-lg font-semibold">الطوابع الزمنية</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {timestamps.length === 0 ? (
                  <div className="text-sm text-gray-500">لا توجد طوابع إضافية.</div>
                ) : (
                  timestamps.map(([label, value]) => (
                    <InfoCard key={label} label={label} value={dateTime(value)} />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-3 text-lg font-semibold">أحداث الدفع</h2>
              <div className="space-y-3">
                {payment.events.length === 0 ? (
                  <div className="text-sm text-gray-500">لا توجد أحداث مسجلة.</div>
                ) : (
                  payment.events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">{event.type}</div>
                        <div className="text-xs text-gray-500">{dateTime(event.createdAt)}</div>
                      </div>
                      <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                        <div>الحالة: {event.status ?? "-"}</div>
                        <div>المزوّد: {event.provider ?? "-"}</div>
                        <div>المرجع: {event.reference ?? "-"}</div>
                      </div>
                      <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-100">
                        {prettyJson(event.payload)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-3 text-lg font-semibold">Metadata</h2>
              <pre className="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-100">
                {prettyJson(payment.metadata)}
              </pre>
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}

function InfoCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={mono ? "mt-1 break-all font-mono text-sm" : "mt-1 text-sm font-medium"}>
        {value}
      </div>
    </div>
  );
}
