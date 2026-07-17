"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, ShieldOff, Gavel, TimerReset } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { api, getApiErrorMessage } from "@/lib/api";
import { num, dateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

interface SanctionsConfig {
  enabled: boolean;
  windowDays: number;
  warnThreshold: number;
  suspendThreshold: number;
  suspendHours: number;
  banThreshold: number;
}

interface SuspendedDriver {
  id: string;
  status: string;
  suspendedUntil?: string | null;
  cancellationStrikes: number;
  lastSanctionAt?: string | null;
  user?: { name?: string | null; phone?: string | null };
}

interface SanctionRow {
  id: string;
  level: string;
  cancellationCount: number;
  windowStart: string;
  windowEnd: string;
  suspendedUntil?: string | null;
  reason?: string | null;
  createdAt: string;
  driver?: {
    id: string;
    status: string;
    user?: { name?: string | null; phone?: string | null };
  };
}

function levelBadge(level: string) {
  const map: Record<string, string> = {
    BAN: "bg-red-100 text-red-700",
    SUSPENSION: "bg-amber-100 text-amber-700",
    WARNING: "bg-yellow-100 text-yellow-700",
  };
  const label: Record<string, string> = {
    BAN: "حظر",
    SUSPENSION: "تعليق",
    WARNING: "تحذير",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        map[level] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {label[level] ?? level}
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    BANNED: "bg-red-100 text-red-700",
    SUSPENDED: "bg-amber-100 text-amber-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
  };
  const label: Record<string, string> = {
    BANNED: "محظور",
    SUSPENDED: "معلّق",
    APPROVED: "نشط",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        map[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {label[status] ?? status}
    </span>
  );
}

export default function DriverSanctionsPage() {
  const { can } = useAuth();
  const canRead = can("drivers.read") || can("drivers.manage");
  const canManage = can("drivers.manage");

  const [config, setConfig] = useState<SanctionsConfig | null>(null);
  const [suspended, setSuspended] = useState<SuspendedDriver[]>([]);
  const [logRows, setLogRows] = useState<SanctionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    if (!canRead) return;
    setError("");
    try {
      const [cfg, susp, log] = await Promise.all([
        api.get("/drivers/sanctions/config"),
        api.get("/drivers/sanctions/suspended"),
        api.get("/drivers/sanctions/log", { params: { page, limit: 20 } }),
      ]);
      setConfig(cfg.data ?? null);
      setSuspended(susp.data ?? []);
      setLogRows(log.data.items ?? []);
      setTotal(log.data.total ?? 0);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "تعذّر تحميل بيانات العقوبات"));
    }
  }, [canRead, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const lift = useCallback(
    async (driverId: string) => {
      if (!canManage) return;
      setBusy(driverId);
      setError("");
      setSuccess("");
      try {
        await api.patch(`/drivers/sanctions/${driverId}/lift`);
        setSuccess("تم رفع التعليق وإعادة تفعيل السائق.");
        await load();
      } catch (liftError) {
        setError(getApiErrorMessage(liftError, "تعذّر رفع التعليق"));
      } finally {
        setBusy("");
      }
    },
    [canManage, load],
  );

  const suspendedColumns: Column<SuspendedDriver>[] = [
    {
      key: "name",
      header: "السائق",
      render: (d) => d.user?.name ?? "-",
    },
    {
      key: "phone",
      header: "الهاتف",
      render: (d) => (
        <span className="font-mono text-xs">{d.user?.phone ?? "-"}</span>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (d) => statusBadge(d.status),
    },
    {
      key: "suspendedUntil",
      header: "حتى",
      render: (d) =>
        d.status === "BANNED"
          ? "دائم (يحتاج رفعًا يدويًا)"
          : d.suspendedUntil
            ? dateTime(d.suspendedUntil)
            : "-",
    },
    {
      key: "strikes",
      header: "التصعيد",
      render: (d) => num(d.cancellationStrikes),
    },
    {
      key: "actions",
      header: "إجراء",
      render: (d) =>
        canManage ? (
          <button
            onClick={() => void lift(d.id)}
            disabled={busy === d.id}
            className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 disabled:opacity-50"
          >
            <TimerReset size={13} /> رفع التعليق
          </button>
        ) : (
          "-"
        ),
    },
  ];

  const logColumns: Column<SanctionRow>[] = [
    {
      key: "driver",
      header: "السائق",
      render: (r) => r.driver?.user?.name ?? "-",
    },
    {
      key: "level",
      header: "العقوبة",
      render: (r) => levelBadge(r.level),
    },
    {
      key: "count",
      header: "عدد الإلغاءات",
      render: (r) => num(r.cancellationCount),
    },
    {
      key: "suspendedUntil",
      header: "التعليق حتى",
      render: (r) => (r.suspendedUntil ? dateTime(r.suspendedUntil) : "-"),
    },
    {
      key: "createdAt",
      header: "الوقت",
      render: (r) => dateTime(r.createdAt),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="عقوبات إلغاء السائق" />
      <div className="space-y-4 p-6">
        {!canRead ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            تتطلّب مطالعة العقوبات صلاحية عرض السائقين.
          </div>
        ) : null}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
          يراقب النظام إلغاءات السائق ضمن نافذة متدحرجة ويطبّق عقوبات
          تصاعدية (تحذير ← تعليق مؤقّت يُرفع تلقائيًا ← حظر يحتاج رفعًا
          يدويًا). السائق المعلّق/المحظور لا يصله أي طلب رحلة ولا يمكنه
          الاتّصال (ONLINE). تُضبط العتبات والمدد من الإعدادات
          (المفتاح trips.driverCancellationSanctions).
        </div>

        {config ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="الحالة"
              value={config.enabled ? "مفعّل" : "معطّل"}
              icon={<Gavel size={18} />}
              accent={config.enabled ? "green" : undefined}
            />
            <StatCard
              label="النافذة (يوم)"
              value={num(config.windowDays)}
              icon={<TimerReset size={18} />}
            />
            <StatCard
              label="عتبة التحذير"
              value={num(config.warnThreshold)}
              icon={<ShieldAlert size={18} />}
            />
            <StatCard
              label="عتبة التعليق"
              value={num(config.suspendThreshold)}
              icon={<ShieldOff size={18} />}
            />
            <StatCard
              label="مدة التعليق (ساعة)"
              value={num(config.suspendHours)}
              icon={<TimerReset size={18} />}
            />
            <StatCard
              label="عتبة الحظر"
              value={num(config.banThreshold)}
              icon={<Gavel size={18} />}
              accent="red"
            />
          </div>
        ) : null}

        {error ? <div className="text-sm text-red-500">{error}</div> : null}
        {success ? (
          <div className="text-sm text-emerald-600">{success}</div>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-lg font-bold">السائقون المعلّقون / المحظورون</h2>
          <DataTable columns={suspendedColumns} rows={suspended} />
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">سجل العقوبات</h2>
          <DataTable columns={logColumns} rows={logRows} />
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>الإجمالي: {num(total)}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
              >
                السابق
              </button>
              <span className="px-2 py-1">
                {page} / {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
              >
                التالي
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
