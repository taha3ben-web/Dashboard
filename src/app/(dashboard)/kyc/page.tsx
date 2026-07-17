"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, Column } from "@/components/DataTable";
import { api } from "@/lib/api";
import { num, dateTime } from "@/lib/format";
import { Check, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { ImageLightbox } from "@/components/ui/ImageLightbox";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
type DocType =
  | "NATIONAL_ID"
  | "PASSPORT"
  | "DRIVING_LICENSE"
  | "RESIDENCE_PERMIT";

interface Submission {
  id: string;
  docType: DocType;
  docNumber?: string | null;
  frontUrl: string;
  backUrl?: string | null;
  selfieUrl?: string | null;
  status: Status;
  note?: string | null;
  reviewedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  user?: { id: string; name: string; phone: string } | null;
}

const STATUS_LABEL: Record<Status, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "موثّقة",
  REJECTED: "مرفوضة",
  EXPIRED: "منتهية",
};

const DOC_LABEL: Record<DocType, string> = {
  NATIONAL_ID: "بطاقة وطنية",
  PASSPORT: "جواز سفر",
  DRIVING_LICENSE: "رخصة قيادة",
  RESIDENCE_PERMIT: "بطاقة إقامة",
};

const STATUS_FILTERS: Array<{ value: "" | Status; label: string }> = [
  { value: "", label: "الكل" },
  { value: "PENDING", label: "قيد المراجعة" },
  { value: "APPROVED", label: "موثّقة" },
  { value: "REJECTED", label: "مرفوضة" },
  { value: "EXPIRED", label: "منتهية" },
];

export default function KycPage() {
  const { can } = useAuth();
  const [items, setItems] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | Status>("PENDING");
  const [busy, setBusy] = useState<string | null>(null);
  // معاينة صور الوثائق داخل مودال بدل فتح صفحة/تبويب جديد.
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(
    null,
  );
  const canManage = can("kyc.manage");

  const load = useCallback(() => {
    const params: Record<string, unknown> = { page, limit: 20 };
    if (status) params.status = status;
    api
      .get("/kyc", { params })
      .then((r) => {
        setItems(r.data.items ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => {});
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(s: Submission) {
    if (!canManage || busy) return;
    const raw = window.prompt(
      "مدة الصلاحية بالأيام (اتركه فارغًا بلا انتهاء):",
      "",
    );
    if (raw === null) return;
    const payload: Record<string, unknown> = {};
    const days = Number(raw.trim());
    if (raw.trim() !== "" && Number.isFinite(days) && days > 0) {
      payload.expiresInDays = Math.trunc(days);
    }
    setBusy(s.id);
    try {
      await api.post(`/kyc/${s.id}/approve`, payload);
      load();
    } catch {
      /* يُعرض الخطأ عبر المعترض العام */
    } finally {
      setBusy(null);
    }
  }

  async function reject(s: Submission) {
    if (!canManage || busy) return;
    const note = window.prompt("سبب الرفض (اختياري):", "");
    if (note === null) return;
    setBusy(s.id);
    try {
      await api.post(`/kyc/${s.id}/reject`, note.trim() ? { note: note.trim() } : {});
      load();
    } catch {
      /* يُعرض الخطأ عبر المعترض العام */
    } finally {
      setBusy(null);
    }
  }

  const columns: Column<Submission>[] = [
    {
      key: "user",
      header: "المستخدم",
      render: (s) => (
        <div>
          <div className="font-medium">{s.user?.name ?? "-"}</div>
          <div className="text-xs text-gray-400">{s.user?.phone}</div>
        </div>
      ),
    },
    { key: "docType", header: "نوع الوثيقة", render: (s) => DOC_LABEL[s.docType] },
    {
      key: "docNumber",
      header: "رقم الوثيقة",
      render: (s) => s.docNumber || "-",
    },
    {
      key: "files",
      header: "المرفقات",
      render: (s) => (
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setPreview({ url: s.frontUrl, title: "الوجه الأمامي" })}
            className="text-brand underline"
          >
            أمام
          </button>
          {s.backUrl ? (
            <button
              type="button"
              onClick={() =>
                setPreview({ url: s.backUrl as string, title: "الوجه الخلفي" })
              }
              className="text-brand underline"
            >
              خلف
            </button>
          ) : null}
          {s.selfieUrl ? (
            <button
              type="button"
              onClick={() =>
                setPreview({ url: s.selfieUrl as string, title: "صورة ذاتية" })
              }
              className="text-brand underline"
            >
              صورة ذاتية
            </button>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (s) => STATUS_LABEL[s.status],
    },
    {
      key: "createdAt",
      header: "تاريخ التقديم",
      render: (s) => dateTime(s.createdAt),
    },
    {
      key: "actions",
      header: "إجراءات",
      render: (s) =>
        s.status === "PENDING" && canManage ? (
          <div className="flex gap-2">
            <button
              onClick={() => approve(s)}
              disabled={busy === s.id}
              className="flex items-center gap-1 rounded bg-green-500/10 px-2 py-1 text-xs text-green-600 disabled:opacity-50"
            >
              <Check size={14} /> موافقة
            </button>
            <button
              onClick={() => reject(s)}
              disabled={busy === s.id}
              className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
            >
              <X size={14} /> رفض
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="تحقق الهوية (KYC)" />
      <div className="space-y-6 p-4 sm:p-6">
        {!canManage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            هذه الصفحة للقراءة فقط. الموافقة أو الرفض يتطلّب صلاحية إدارة تحقق الهوية.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || "ALL"}
              onClick={() => {
                setPage(1);
                setStatus(f.value);
              }}
              className={
                status === f.value
                  ? "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div>
          <DataTable columns={columns} rows={items} />
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
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
        </div>
      </div>
      <ImageLightbox
        open={!!preview}
        onClose={() => setPreview(null)}
        src={preview?.url ?? null}
        title={preview?.title ?? ""}
      />
    </>
  );
}
