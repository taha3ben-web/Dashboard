"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime } from "@/lib/format";
import type { SettingRevision } from "./settings.types";

interface Props {
  settingKey: string | null;
  currentPublishedVersion: number;
  onClose: () => void;
  onRollbackComplete: () => Promise<void>;
}

export function SettingHistoryModal({
  settingKey,
  currentPublishedVersion,
  onClose,
  onRollbackComplete,
}: Props) {
  const [revisions, setRevisions] = useState<SettingRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyVersion, setBusyVersion] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!settingKey) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(
        `/settings/${encodeURIComponent(settingKey)}/revisions`,
        { params: { limit: 100 } },
      );
      setRevisions(response.data.items ?? []);
    } catch (loadError) {
      setRevisions([]);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل سجل النسخ"));
    } finally {
      setLoading(false);
    }
  }, [settingKey]);

  useEffect(() => {
    void load();
  }, [load]);

  async function rollback(version: number) {
    if (!settingKey) return;
    setBusyVersion(version);
    setError("");
    try {
      await api.post(
        `/settings/${encodeURIComponent(settingKey)}/rollback/${version}`,
      );
      await onRollbackComplete();
      await load();
    } catch (rollbackError) {
      setError(getApiErrorMessage(rollbackError, "تعذّر استرجاع النسخة"));
    } finally {
      setBusyVersion(null);
    }
  }

  return (
    <Modal
      open={Boolean(settingKey)}
      onClose={onClose}
      title={settingKey ? `سجل نشر ${settingKey}` : "سجل النشر"}
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          الاسترجاع ينشئ مسودة وطلب مراجعة. لن تُنشر حتى يعتمدها موظف آخر، ولا
          يُحذف أو يُعدّل السجل السابق.
        </p>
        {error ? (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">
            جارٍ تحميل سجل النشر...
          </div>
        ) : revisions.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            لا توجد نسخ منشورة بعد.
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {revisions.map((revision) => (
              <div
                key={revision.id}
                className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      النسخة المنشورة v{revision.publishedVersion}
                    </div>
                    <div className="text-xs text-gray-500">
                      {revision.action} · مصدر v{revision.sourceVersion} ·{" "}
                      {dateTime(revision.createdAt)}
                    </div>
                  </div>
                  {revision.publishedVersion !== currentPublishedVersion ? (
                    <button
                      onClick={() => void rollback(revision.publishedVersion)}
                      disabled={busyVersion !== null}
                      className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 disabled:opacity-50"
                    >
                      {busyVersion === revision.publishedVersion
                        ? "جارٍ الاسترجاع..."
                        : "طلب استرجاع"}
                    </button>
                  ) : (
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                      الحالية
                    </span>
                  )}
                </div>
                <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-gray-50 p-2 text-xs dark:bg-gray-950">
                  {JSON.stringify(revision.value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
