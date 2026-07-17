"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ShieldCheck, ShieldAlert } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

type BackupRecord = {
  id: string;
  kind: string;
  status: string;
  trigger: string;
  storageLocation?: string | null;
  sizeMb?: number | null;
  checksum?: string | null;
  startedAt: string;
  completedAt?: string | null;
  error?: string | null;
  retained: boolean;
};

type DrStatus = {
  healthy: boolean;
  ageMinutes: number | null;
  rpoMinutes: number;
  breached: boolean;
  lastSuccessfulAt: string | null;
  intervalMinutes: number;
  nextBackupDue: string | null;
};

const KINDS = ["DATABASE", "FILES", "FULL"];
const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"];
const TRIGGERS = ["SCHEDULED", "MANUAL", "SYSTEM"];

function sizeLabel(mb?: number | null): string {
  if (mb == null) return "-";
  if (mb < 1024) return `${num(mb)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

type FormState = {
  kind: string;
  status: string;
  trigger: string;
  storageLocation: string;
  sizeMb: string;
  checksum: string;
};

const EMPTY_FORM: FormState = {
  kind: "DATABASE",
  status: "COMPLETED",
  trigger: "MANUAL",
  storageLocation: "",
  sizeMb: "",
  checksum: "",
};

export default function BackupsPage() {
  const { can } = useAuth();
  const canManage = can("settings.manage");
  const [rows, setRows] = useState<BackupRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dr, setDr] = useState<DrStatus | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, drRes] = await Promise.all([
        api.get("/backups", { params: { page, limit } }),
        api.get("/backups/dr-status"),
      ]);
      setRows(list.data.items ?? []);
      setTotal(list.data.total ?? 0);
      setDr(drRes.data ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post("/backups", {
        kind: form.kind,
        status: form.status,
        trigger: form.trigger,
        storageLocation: form.storageLocation.trim() || undefined,
        sizeMb: form.sizeMb ? Number(form.sizeMb) : undefined,
        checksum: form.checksum.trim() || undefined,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: BackupRecord) => {
    if (!window.confirm("حذف سجل النسخة؟")) return;
    setError(null);
    try {
      await api.delete(`/backups/${row.id}`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const applyRetention = async () => {
    setError(null);
    try {
      const preview = await api.post("/backups/retention/apply", { dryRun: "true" });
      const pruneCount = preview.data.pruneCount ?? 0;
      const retainCount = preview.data.retainCount ?? 0;
      if (!window.confirm(`سيتم استبقاء ${retainCount} وتعليم ${pruneCount} للتقليم. المتابعة؟`)) return;
      await api.post("/backups/retention/apply", {});
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const columns = useMemo<Column<BackupRecord>[]>(
    () => [
      { key: "kind", header: "النوع", render: (r) => r.kind },
      {
        key: "status",
        header: "الحالة",
        render: (r) => (
          <span
            className={
              r.status === "COMPLETED"
                ? "text-emerald-600"
                : r.status === "FAILED"
                  ? "text-red-600"
                  : "text-amber-600"
            }
          >
            {r.status}
          </span>
        ),
      },
      { key: "trigger", header: "المصدر", render: (r) => r.trigger },
      { key: "sizeMb", header: "الحجم", render: (r) => sizeLabel(r.sizeMb) },
      {
        key: "retained",
        header: "الاستبقاء",
        render: (r) => (
          <span className={r.retained ? "text-emerald-600" : "text-slate-400"}>
            {r.retained ? "مُستبقاة" : "للتقليم"}
          </span>
        ),
      },
      { key: "completedAt", header: "اكتملت", render: (r) => (r.completedAt ? dateTime(r.completedAt) : "-") },
      {
        key: "actions",
        header: "إجراءات",
        render: (r) =>
          canManage ? (
            <button onClick={() => remove(r)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" aria-label="حذف">
              <Trash2 size={16} />
            </button>
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
    ],
    [canManage],
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <Topbar title="النسخ الاحتياطي والتعافي" />

      {dr && (
        <div
          className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 ${
            dr.healthy
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          {dr.healthy ? (
            <ShieldCheck className="text-emerald-600" size={28} />
          ) : (
            <ShieldAlert className="text-red-600" size={28} />
          )}
          <div>
            <p className="font-bold">
              {dr.healthy ? "حالة التعافي: سليمة" : "تحذير: تجاوز هدف RPO"}
            </p>
            <p className="text-sm text-slate-600">
              آخر نسخة ناجحة: {dr.lastSuccessfulAt ? dateTime(dr.lastSuccessfulAt) : "لا توجد"} · العمر:{" "}
              {dr.ageMinutes == null ? "-" : `${num(dr.ageMinutes)} د`} · RPO: {num(dr.rpoMinutes)} د
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          سجلّ ميتاداتا النسخ الاحتياطية ومتابعة حالة التعافي وسياسة الاستبقاء.
        </p>
        {canManage && (
          <div className="flex items-center gap-2">
            <button onClick={applyRetention} className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
              تطبيق الاستبقاء
            </button>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              <Plus size={16} /> تسجيل نسخة
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="لا توجد نسخ احتياطية مسجّلة بعد"
      />

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">الإجمالي: {total}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border px-3 py-1 disabled:opacity-40">السابق</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">التالي</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">تسجيل نسخة احتياطية</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">النوع
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="rounded-lg border px-3 py-2">
                  {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">الحالة
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border px-3 py-2">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">المصدر
                <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} className="rounded-lg border px-3 py-2">
                  {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">الحجم (MB)
                <input type="number" value={form.sizeMb} onChange={(e) => setForm({ ...form, sizeMb: e.target.value })} className="rounded-lg border px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">موقع التخزين
                <input value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} className="rounded-lg border px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">بصمة التحقق (checksum)
                <input value={form.checksum} onChange={(e) => setForm({ ...form, checksum: e.target.value })} className="rounded-lg border px-3 py-2" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-xl border px-4 py-2 text-sm">إلغاء</button>
              <button onClick={submit} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
