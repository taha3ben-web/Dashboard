"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Modal } from "@/components/ui/Modal";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import type { SettingChangeRequest } from "../settings/settings.types";

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type ReviewAction = "approve" | "reject";

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
  CANCELLED: "ملغى",
};

export default function SettingApprovalsPage() {
  const { profile } = useAuth();
  const [status, setStatus] = useState<RequestStatus>("PENDING");
  const [requests, setRequests] = useState<SettingChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [review, setReview] = useState<{
    request: SettingChangeRequest;
    action: ReviewAction;
  } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/setting-change-requests", {
        params: { status },
      });
      setRequests(response.data ?? []);
      setError("");
    } catch (loadError) {
      setRequests([]);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل طلبات المراجعة"));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitReview() {
    if (!review) return;
    setBusy(true);
    setError("");
    try {
      await api.post(
        `/setting-change-requests/${review.request.id}/${review.action}`,
        { note: note.trim() || undefined },
      );
      setSuccess(
        review.action === "approve"
          ? "تم اعتماد التغيير ونشر نسخة إعدادات جديدة."
          : "تم رفض التغيير مع حفظ قرار المراجعة.",
      );
      setReview(null);
      setNote("");
      await load();
    } catch (reviewError) {
      setError(getApiErrorMessage(reviewError, "تعذّرت معالجة طلب المراجعة"));
    } finally {
      setBusy(false);
    }
  }

  const currentUserId = profile?.user.id;

  return (
    <>
      <Topbar title="موافقات نشر الإعدادات" />
      <div className="space-y-5 p-4 sm:p-6">
        <section className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-200">
          قاعدة الأربعة أعين: منشئ التغيير لا يستطيع اعتماده أو رفضه. لا يحدث
          النشر إلا بعد موافقة موظف آخر، مع حفظ النسخة وهوية الطرفين.
        </section>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABELS) as RequestStatus[]).map((value) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={
                status === value
                  ? "rounded-lg bg-brand px-3 py-2 text-sm text-white"
                  : "rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
              }
            >
              {STATUS_LABELS[value]}
            </button>
          ))}
        </div>

        {success ? (
          <div className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border p-10 text-center text-sm text-gray-500 dark:border-gray-800">
            جارٍ تحميل طلبات المراجعة...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border p-10 text-center text-sm text-gray-500 dark:border-gray-800">
            لا توجد طلبات ضمن هذه الحالة.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const own = request.requestedBy.id === currentUserId;
              const stale = request.sourceVersion !== request.setting.version;
              return (
                <article
                  key={request.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-mono font-semibold">
                        {request.setting.key}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        طلبه {request.requestedBy.name} ·{" "}
                        {dateTime(request.createdAt)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
                          {request.requestType === "ROLLBACK"
                            ? `استرجاع v${request.rollbackFromVersion}`
                            : "تحديث إعداد"}
                        </span>
                        <span className="rounded bg-violet-100 px-2 py-1 text-violet-700">
                          {STATUS_LABELS[request.status]}
                        </span>
                        {own ? (
                          <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">
                            طلبك — يلزم مراجع آخر
                          </span>
                        ) : null}
                        {stale ? (
                          <span className="rounded bg-red-100 px-2 py-1 text-red-700">
                            المسودة تغيّرت بعد الطلب
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {request.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setReview({ request, action: "approve" });
                            setNote("");
                          }}
                          disabled={own || stale}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-40"
                        >
                          <CheckCircle2 size={16} /> اعتماد ونشر
                        </button>
                        <button
                          onClick={() => {
                            setReview({ request, action: "reject" });
                            setNote("");
                          }}
                          disabled={own}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 disabled:opacity-40"
                        >
                          <XCircle size={16} /> رفض
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-medium text-gray-500">
                        النسخة المنشورة الحالية
                      </div>
                      <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-950">
                        {JSON.stringify(
                          request.setting.publishedValue,
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium text-gray-500">
                        القيمة المطلوب نشرها
                      </div>
                      <pre className="max-h-64 overflow-auto rounded-lg bg-violet-50 p-3 text-xs dark:bg-violet-950/20">
                        {JSON.stringify(request.requestedValue, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {request.reviewedBy ? (
                    <div className="mt-3 text-sm text-gray-500">
                      راجعه {request.reviewedBy.name} ·{" "}
                      {dateTime(request.reviewedAt)}
                      {request.reviewNote ? ` · ${request.reviewNote}` : ""}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(review)}
        onClose={() => setReview(null)}
        title={
          review?.action === "approve" ? "اعتماد ونشر التغيير" : "رفض التغيير"
        }
        footer={
          <>
            <button
              onClick={() => setReview(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void submitReview()}
              disabled={busy}
              className={
                review?.action === "approve"
                  ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                  : "rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              }
            >
              {busy
                ? "جارٍ التنفيذ..."
                : review?.action === "approve"
                  ? "اعتماد ونشر"
                  : "تأكيد الرفض"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {review?.action === "approve"
              ? "سيصل التغيير إلى التطبيقات بعد تحديث نسخة التكوين."
              : "ستبقى النسخة المنشورة الحالية دون تغيير."}
          </p>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="ملاحظة المراجعة — اختيارية"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
      </Modal>
    </>
  );
}
