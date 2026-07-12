"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Briefcase,
  CreditCard,
  Landmark,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { money, num } from "@/lib/format";

interface Revenue {
  companyEarnings: number;
  driverNet: number;
  commissions: number;
  paymentsCollected: number;
  withdrawalsPaid: number;
}

interface PaymentOps {
  totalCount: number;
  totalAmount: number;
  capturedAmount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
}

interface WithdrawalOps {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
}

interface FundingOps {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  fundedCount: number;
  rejectedCount: number;
  fundedAmount: number;
}

interface TransferOps {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  completedCount: number;
  rejectedCount: number;
  completedAmount: number;
  flaggedCount: number;
}

interface FinancialHealth {
  totalTransactions: number;
  postedCount: number;
  pendingCount: number;
  failedCount: number;
  reversedCount: number;
  cancelledCount: number;
  tripReferences: number;
  paymentReferences: number;
  withdrawalReferences: number;
  fundingReferences: number;
  transferReferences: number;
  platformCash: number;
  withdrawalReserve: number;
  cardReceivable: number;
  userLiabilities: number;
}

export default function FinancialDashboardPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [paymentOps, setPaymentOps] = useState<PaymentOps | null>(null);
  const [withdrawalOps, setWithdrawalOps] = useState<WithdrawalOps | null>(null);
  const [fundingOps, setFundingOps] = useState<FundingOps | null>(null);
  const [transferOps, setTransferOps] = useState<TransferOps | null>(null);
  const [health, setHealth] = useState<FinancialHealth | null>(null);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const next: Record<string, string> = {};
    if (from) next.from = new Date(`${from}T00:00:00.000Z`).toISOString();
    if (to) next.to = new Date(`${to}T23:59:59.999Z`).toISOString();
    return next;
  }, [from, to]);

  const load = useCallback(() => {
    setError("");
    Promise.all([
      api.get("/statistics/revenue", { params }),
      api.get("/statistics/payment-ops", { params }),
      api.get("/statistics/withdrawal-ops", { params }),
      api.get("/statistics/funding-ops", { params }),
      api.get("/statistics/transfer-ops", { params }),
      api.get("/statistics/financial-health", { params }),
    ])
      .then(
        ([
          revenueResponse,
          paymentOpsResponse,
          withdrawalOpsResponse,
          fundingOpsResponse,
          transferOpsResponse,
          healthResponse,
        ]) => {
          setRevenue(revenueResponse.data ?? null);
          setPaymentOps(paymentOpsResponse.data ?? null);
          setWithdrawalOps(withdrawalOpsResponse.data ?? null);
          setFundingOps(fundingOpsResponse.data ?? null);
          setTransferOps(transferOpsResponse.data ?? null);
          setHealth(healthResponse.data ?? null);
        },
      )
      .catch((loadError) => {
        setRevenue(null);
        setPaymentOps(null);
        setWithdrawalOps(null);
        setFundingOps(null);
        setTransferOps(null);
        setHealth(null);
        setError(
          loadError instanceof Error ? loadError.message : "تعذّر تحميل لوحة المالية",
        );
      });
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Topbar title="لوحة المالية" />
      <div className="space-y-6 p-6">
        <section className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <div className="mb-1 text-xs text-gray-500">من</div>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-gray-500">إلى</div>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <button
            onClick={() => void load()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            تطبيق
          </button>
          <button
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
          >
            إعادة ضبط
          </button>
        </section>

        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="إيراد الشركة" value={money(revenue?.companyEarnings)} icon={<Landmark size={18} />} accent="brand" />
          <StatCard label="المدفوعات المحصلة" value={money(revenue?.paymentsCollected)} icon={<CreditCard size={18} />} accent="green" />
          <StatCard label="صافي السائقين" value={money(revenue?.driverNet)} icon={<Wallet size={18} />} accent="blue" />
          <StatCard label="السحوبات المدفوعة" value={money(revenue?.withdrawalsPaid)} icon={<Briefcase size={18} />} accent="amber" />
          <StatCard label="رصيد المنصة النقدي" value={money(health?.platformCash)} icon={<Landmark size={18} />} />
          <StatCard label="احتياطي السحوبات" value={money(health?.withdrawalReserve)} icon={<Wallet size={18} />} accent="amber" />
          <StatCard label="مستحقات البطاقات" value={money(health?.cardReceivable)} icon={<CreditCard size={18} />} accent="blue" />
          <StatCard label="التزامات المحافظ" value={money(health?.userLiabilities)} icon={<Briefcase size={18} />} accent="red" />
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Panel title="عمليات الدفع">
            <MiniStat label="إجمالي العمليات" value={num(paymentOps?.totalCount)} />
            <MiniStat label="القيمة الكلية" value={money(paymentOps?.totalAmount)} />
            <MiniStat label="المحصلة" value={money(paymentOps?.capturedAmount)} />
            <MiniStat label="المعلّقة" value={num(paymentOps?.pendingCount)} />
            <MiniStat label="الفاشلة" value={num(paymentOps?.failedCount)} />
            <MiniStat label="المستردة" value={num(paymentOps?.refundedCount)} />
          </Panel>

          <Panel title="شحن السائقين">
            <MiniStat label="إجمالي الطلبات" value={num(fundingOps?.totalCount)} />
            <MiniStat label="القيمة الكلية" value={money(fundingOps?.totalAmount)} />
            <MiniStat label="قيد الانتظار" value={num(fundingOps?.pendingCount)} />
            <MiniStat label="معتمدة" value={num(fundingOps?.approvedCount)} />
            <MiniStat label="تم شحنها" value={num(fundingOps?.fundedCount)} />
            <MiniStat label="قيمة الشحن المنفذة" value={money(fundingOps?.fundedAmount)} />
          </Panel>

          <Panel title="تحويلات السائقين">
            <MiniStat label="إجمالي الطلبات" value={num(transferOps?.totalCount)} />
            <MiniStat label="القيمة الكلية" value={money(transferOps?.totalAmount)} />
            <MiniStat label="قيد الانتظار" value={num(transferOps?.pendingCount)} />
            <MiniStat label="معتمدة" value={num(transferOps?.approvedCount)} />
            <MiniStat label="مكتملة" value={num(transferOps?.completedCount)} />
            <MiniStat label="عليها رايات مخاطر" value={num(transferOps?.flaggedCount)} />
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="السيولة وصحة الدفتر">
            <MiniStat label="إجمالي الحركات" value={num(health?.totalTransactions)} />
            <MiniStat label="POSTED" value={num(health?.postedCount)} />
            <MiniStat label="PENDING" value={num(health?.pendingCount)} />
            <MiniStat label="FAILED" value={num(health?.failedCount)} />
            <MiniStat label="REVERSED" value={num(health?.reversedCount)} />
            <MiniStat label="CANCELLED" value={num(health?.cancelledCount)} />
          </Panel>

          <Panel title="توزيع المراجع المالية">
            <MiniStat label="TRIP" value={num(health?.tripReferences)} />
            <MiniStat label="PAYMENT" value={num(health?.paymentReferences)} />
            <MiniStat label="WITHDRAWAL" value={num(health?.withdrawalReferences)} />
            <MiniStat label="DRIVER_FUNDING" value={num(health?.fundingReferences)} />
            <MiniStat label="DRIVER_TRANSFER" value={num(health?.transferReferences)} />
            <MiniStat label="العمولات" value={money(revenue?.commissions)} />
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="تشغيل السحوبات">
            <MiniStat label="إجمالي الطلبات" value={num(withdrawalOps?.totalCount)} />
            <MiniStat label="إجمالي القيمة" value={money(withdrawalOps?.totalAmount)} />
            <MiniStat label="قيد الانتظار" value={num(withdrawalOps?.pendingCount)} />
            <MiniStat label="معتمدة" value={num(withdrawalOps?.approvedCount)} />
            <MiniStat label="مدفوعة" value={num(withdrawalOps?.paidCount)} />
            <MiniStat label="مرفوضة" value={num(withdrawalOps?.rejectedCount)} />
          </Panel>

          <Panel title="روابط تشغيل سريعة">
            <QuickLink href="/payments" label="إدارة المدفوعات" />
            <QuickLink href="/earnings" label="تشغيل السحوبات والأرباح" />
            <QuickLink href="/financial-transactions" label="قيود الدفتر المالي" />
            <QuickLink href="/reports" label="التقارير التشغيلية" />
          </Panel>
        </section>
      </div>
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-b-0 dark:border-gray-800">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-gray-100 py-3 text-sm font-medium text-brand last:border-b-0 dark:border-gray-800"
    >
      <span>{label}</span>
      <ArrowRightLeft size={16} />
    </Link>
  );
}
