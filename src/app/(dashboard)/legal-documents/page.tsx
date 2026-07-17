"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Plus, UploadCloud } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";

type LegalType =
  | "PRIVACY_POLICY"
  | "TERMS_OF_SERVICE"
  | "DRIVER_AGREEMENT"
  | "COOKIE_POLICY"
  | "REFUND_POLICY";

type Audience = "ALL" | "PASSENGER" | "DRIVER";

type Status = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

interface LegalDocument {
  id: string;
  type: LegalType;
  audience: Audience;
  locale: string;
  title: string;
  body: string;
  summary?: string | null;
  version: number;
  status: Status;
  requiresAcceptance: boolean;
  publishedVersion: number;
  publishedAt?: string | null;
  effectiveAt?: string | null;
  isActive: boolean;
  updatedAt: string;
}

interface DocForm {
  open: boolean;
  id: string | null;
  type: LegalType;
  audience: Audience;
  locale: string;
  title: string;
  body: string;
  summary: string;
  requiresAcceptance: boolean;
  effectiveAt: string;
  isActive: boolean;
}

const TYPE_LABELS: Record<LegalType, string> = {
  PRIVACY_POLICY: "سياسة الخصوصية",
  TERMS_OF_SERVICE: "شروط الاستخدام",
  DRIVER_AGREEMENT: "اتفاقية السائق",
  COOKIE_POLICY: "سياسة ملفات الارتباط",
  REFUND_POLICY: "سياسة الاسترداد",
};

const AUDIENCE_LABELS: Record<Audience, string> = {
  ALL: "كل المستخدمين",
  PASSENGER: "الركّاب",
  DRIVER: "السائقون",
};

const STATUS_LABELS: Record<Status, string> = {
  DRAFT: "مسودة",
  PENDING: "قيد المراجعة",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

const STATUS_STYLE: Record<Status, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-slate-200 text-slate-500",
};

const EMPTY_FORM: DocForm = {
  open: false,
  id: null,
  type: "PRIVACY_POLICY",
  audience: "ALL",
  locale: "ar",
  title: "",
  body: "",
  summary: "",
  requiresAcceptance: true,
  effectiveAt: "",
  isActive: true,
};

function toLocalDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function LegalDocumentsPage() {
  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [form, setForm] = useState<DocForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [publishDoc, setPublishDoc] = useState<LegalDocument | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/legal-documents");
      setDocs(response.data ?? []);
      setError("");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "تعذّر تحميل المستندات القانونية"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const published = docs.filter((d) => d.status === "PUBLISHED").length;
    const drafts = docs.filter((d) => d.status === "DRAFT").length;
    const requiresAcceptance = docs.filter(
      (d) => d.requiresAcceptance && d.isActive,
    ).length;
    const staleDrafts = docs.filter(
      (d) => d.status === "PUBLISHED" && d.version > d.publishedVersion,
    ).length;
    return {
      total: docs.length,
      published,
      drafts,
      requiresAcceptance,
      staleDrafts,
    };
  }, [docs]);

  function openEditor(doc?: LegalDocument) {
    setForm(
      doc
        ? {
            open: true,
            id: doc.id,
            type: doc.type,
            audience: doc.audience,
            locale: doc.locale,
            title: doc.title,
            body: doc.body,
            summary: doc.summary ?? "",
            requiresAcceptance: doc.requiresAcceptance,
            effectiveAt: toLocalDateTime(doc.effectiveAt),
            isActive: doc.isActive,
          }
        : { ...EMPTY_FORM, open: true },
    );
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) {
      setError("العنوان والمحتوى مطلوبان");
      return;
    }
    setBusy("save");
    setError("");
    setSuccess("");
    try {
      const effectiveAt = form.effectiveAt
        ? new Date(form.effectiveAt).toISOString()
        : null;
      if (form.id) {
        await api.patch(`/legal-documents/${form.id}`, {
          title: form.title.trim(),
          body: form.body,
          summary: form.summary.trim() || null,
          requiresAcceptance: form.requiresAcceptance,
          effectiveAt,
          isActive: form.isActive,
        });
        setSuccess("تم حفظ التعديلات كمسودة — انشر لتفعيلها في التطبيقات");
      } else {
        await api.post("/legal-documents", {
          type: form.type,
          audience: form.audience,
          locale: form.locale.trim().toLowerCase() || "ar",
          title: form.title.trim(),
          body: form.body,
          summary: form.summary.trim() || undefined,
          requiresAcceptance: form.requiresAcceptance,
          effectiveAt: effectiveAt ?? undefined,
        });
        setSuccess("تم إنشاء المستند كمسودة");
      }
      setForm(EMPTY_FORM);
      await load();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "تعذّر حفظ المستند"));
    } finally {
      setBusy("");
    }
  }

  async function confirmPublish() {
    if (!publishDoc) return;
    setBusy("publish");
    setError("");
    setSuccess("");
    try {
      await api.post(`/legal-documents/${publishDoc.id}/publish`, {});
      setSuccess("تم نشر المستند — أصبح ساري المفعول في التطبيقات");
      setPublishDoc(null);
      await load();
    } catch (publishError) {
      setError(getApiErrorMessage(publishError, "تعذّر نشر المستند"));
    } finally {
      setBusy("");
    }
  }

  const columns: Column<LegalDocument>[] = [
    {
      key: "type",
      header: "المستند",
      render: (doc) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-800">
            {TYPE_LABELS[doc.type]}
          </span>
          <span className="text-xs text-slate-500">{doc.title}</span>
        </div>
      ),
    },
    {
      key: "audience",
      header: "الجمهور",
      render: (doc) => (
        <span className="text-sm text-slate-600">
          {AUDIENCE_LABELS[doc.audience]} · {doc.locale.toUpperCase()}
        </span>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (doc) => (
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[doc.status]}`}
          >
            {STATUS_LABELS[doc.status]}
          </span>
          {doc.status === "PUBLISHED" && doc.version > doc.publishedVersion ? (
            <span className="text-xs text-amber-600">تعديلات غير منشورة</span>
          ) : null}
          {!doc.isActive ? (
            <span className="text-xs text-slate-400">معطّل</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "acceptance",
      header: "الموافقة",
      render: (doc) =>
        doc.requiresAcceptance ? (
          <span className="text-sm text-emerald-700">إلزامية</span>
        ) : (
          <span className="text-sm text-slate-400">اختيارية</span>
        ),
    },
    {
      key: "publishedVersion",
      header: "الإصدار المنشور",
      render: (doc) => (
        <span className="text-sm text-slate-600">
          {doc.publishedVersion > 0 ? `v${num(doc.publishedVersion)}` : "—"}
        </span>
      ),
    },
    {
      key: "effectiveAt",
      header: "يسري من",
      render: (doc) => (
        <span className="text-xs text-slate-500">
          {doc.effectiveAt ? dateTime(doc.effectiveAt) : "فور النشر"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (doc) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => openEditor(doc)}
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            تعديل
          </button>
          <button
            type="button"
            onClick={() => setPublishDoc(doc)}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700"
          >
            <UploadCloud className="h-4 w-4" /> نشر
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Topbar
        title="الشروط والخصوصية"
        subtitle="إدارة المستندات القانونية وموافقة المستخدمين — تُدار وتُنشر بالكامل من اللوحة"
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Metric label="إجمالي المستندات" value={num(totals.total)} />
        <Metric label="منشورة" value={num(totals.published)} />
        <Metric label="مسودات" value={num(totals.drafts)} />
        <Metric label="موافقة إلزامية" value={num(totals.requiresAcceptance)} />
        <Metric label="تعديلات غير منشورة" value={num(totals.staleDrafts)} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500">
          <BookOpen className="h-5 w-5" />
          <span className="text-sm">
            التطبيقات تقرأ المستندات المنشورة عبر <code>/public/legal</code>{" "}
            وتسجّل الموافقة عبر <code>/legal-documents/:id/accept</code>
          </span>
        </div>
        <button
          type="button"
          onClick={() => openEditor()}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> مستند جديد
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={docs}
        loading={loading}
        empty="لا توجد مستندات قانونية بعد"
      />

      <Modal
        open={form.open}
        title={form.id ? "تعديل مستند قانوني" : "مستند قانوني جديد"}
        onClose={() => setForm(EMPTY_FORM)}
      >
        <div className="flex flex-col gap-4">
          {!form.id ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">النوع</span>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as LegalType })
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2"
                >
                  {Object.keys(TYPE_LABELS).map((key) => (
                    <option key={key} value={key}>
                      {TYPE_LABELS[key as LegalType]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">الجمهور</span>
                <select
                  value={form.audience}
                  onChange={(e) =>
                    setForm({ ...form, audience: e.target.value as Audience })
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2"
                >
                  {Object.keys(AUDIENCE_LABELS).map((key) => (
                    <option key={key} value={key}>
                      {AUDIENCE_LABELS[key as Audience]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">اللغة</span>
                <input
                  value={form.locale}
                  onChange={(e) => setForm({ ...form, locale: e.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  placeholder="ar"
                />
              </label>
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">العنوان</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">ملخّص قصير (اختياري)</span>
            <input
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">المحتوى</span>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={10}
              className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">يسري من (اختياري)</span>
              <input
                type="datetime-local"
                value={form.effectiveAt}
                onChange={(e) =>
                  setForm({ ...form, effectiveAt: e.target.value })
                }
                className="rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <div className="flex flex-col justify-center gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.requiresAcceptance}
                  onChange={(e) =>
                    setForm({ ...form, requiresAcceptance: e.target.checked })
                  }
                />
                موافقة إلزامية من المستخدم
              </label>
              {form.id ? (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                  />
                  مفعّل
                </label>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setForm(EMPTY_FORM)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy === "save"}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === "save" ? "جارٍ الحفظ…" : "حفظ كمسودة"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!publishDoc}
        title="نشر المستند القانوني"
        message={
          publishDoc
            ? `سيتم نشر «${TYPE_LABELS[publishDoc.type]}» كإصدار جديد وسيُطلب من المستخدمين الموافقة عليه مجددًا.`
            : ""
        }
        confirmLabel="نشر"
        onConfirm={() => confirmPublish()}
        onCancel={() => setPublishDoc(null)}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}
