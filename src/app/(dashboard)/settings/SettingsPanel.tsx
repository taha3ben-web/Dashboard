"use client";

import { Plus, Save } from "lucide-react";
import { dateTime } from "@/lib/format";
import type { Setting } from "./settings.types";

interface Props {
  settings: Setting[];
  drafts: Record<string, string>;
  dirtyKeys: string[];
  search: string;
  setSearch: (value: string) => void;
  groupFilter: string;
  setGroupFilter: (value: string) => void;
  groups: string[];
  loading: boolean;
  busyAction: string;
  updateDraft: (key: string, value: string) => void;
  openEditor: (setting?: Setting) => void;
  saveOne: (key: string) => Promise<void>;
  saveAll: () => Promise<void>;
  refresh: () => Promise<void>;
  remove: (setting: Setting) => void;
}

export function SettingsPanel(props: Props) {
  const {
    settings,
    drafts,
    dirtyKeys,
    search,
    setSearch,
    groupFilter,
    setGroupFilter,
    groups,
    loading,
    busyAction,
    updateDraft,
    openEditor,
    saveOne,
    saveAll,
    refresh,
    remove,
  } = props;

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">إعدادات النظام</h2>
          <p className="text-sm text-gray-500">
            القيم العامة تصل للتطبيقات، والحساسة تبقى مخفية.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openEditor()}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
          >
            <Plus size={15} /> إعداد جديد
          </button>
          <button
            onClick={() => void saveAll()}
            disabled={dirtyKeys.length === 0 || busyAction === "bulk-settings"}
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Save size={15} /> حفظ كل التغييرات ({dirtyKeys.length})
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="بحث بالمفتاح أو المجموعة"
          className="min-w-72 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
        <select
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">كل المجموعات</option>
          {groups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
        >
          تحديث
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">
          جارٍ تحميل الإعدادات...
        </div>
      ) : settings.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          لا توجد إعدادات مطابقة.
        </div>
      ) : (
        <div className="space-y-2">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="grid gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800 lg:grid-cols-[220px_1fr_auto]"
            >
              <div>
                <div className="font-mono text-sm font-medium">
                  {setting.key}
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                    {setting.group || "بدون مجموعة"}
                  </span>
                  <span
                    className={
                      setting.isPublic
                        ? "rounded bg-green-100 px-2 py-0.5 text-green-700"
                        : "rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800"
                    }
                  >
                    {setting.isPublic ? "عام" : "داخلي"}
                  </span>
                  {setting.isSensitive ? (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">
                      حساس
                    </span>
                  ) : null}
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">
                    v{setting.version}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {dateTime(setting.updatedAt)}
                </div>
              </div>
              <textarea
                value={drafts[setting.key] ?? ""}
                onChange={(event) =>
                  updateDraft(setting.key, event.target.value)
                }
                rows={setting.isSensitive ? 2 : 4}
                placeholder={
                  setting.isSensitive && setting.hasValue
                    ? "قيمة محفوظة ومخفية — أدخل قيمة جديدة فقط عند الاستبدال"
                    : "قيمة JSON أو نص"
                }
                className="rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <div className="flex flex-wrap items-start gap-1">
                <button
                  onClick={() => void saveOne(setting.key)}
                  disabled={
                    !dirtyKeys.includes(setting.key) ||
                    busyAction === `setting:${setting.key}`
                  }
                  className="rounded bg-brand px-2 py-1 text-xs text-white disabled:opacity-50"
                >
                  حفظ
                </button>
                <button
                  onClick={() => openEditor(setting)}
                  className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600"
                >
                  خصائص
                </button>
                <button
                  onClick={() => remove(setting)}
                  className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
