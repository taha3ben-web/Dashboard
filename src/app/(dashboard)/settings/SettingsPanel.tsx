"use client";

import { Plus, Save } from "lucide-react";
import { dateTime } from "@/lib/format";
import type { Setting } from "./settings.types";
import { FriendlyJsonEditor, friendlySettingTitle, isFriendlySetting } from "./FriendlyJsonEditor";

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
  requestReview: (key: string) => Promise<void>;
  discardDraft: (key: string) => Promise<void>;
  openHistory: (setting: Setting) => void;
  refresh: () => Promise<void>;
  remove: (setting: Setting) => void;
}

const DRIVER_PENALTY_KEY = "trips.driverCancellationPenaltyPct";

// يقرأ نسبة الغرامة (pct) من مسودة JSON المخزّنة، مقيّدة ضمن 0..100.
function readPenaltyPct(draft: string | undefined): number {
  if (!draft) return 0;
  try {
    const parsed = JSON.parse(draft) as { pct?: unknown };
    const value = Number(parsed?.pct);
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  } catch {
    return 0;
  }
}

// يضبط مدخل المستخدم إلى عدد صحيح 0..100.
function clampPenaltyPct(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

// ===== إعدادات عقوبات إلغاء السائق (Stage 66) =====
const DRIVER_SANCTIONS_KEY = "trips.driverCancellationSanctions";

type SanctionsConfig = {
  enabled: boolean;
  windowDays: number;
  warnThreshold: number;
  suspendThreshold: number;
  suspendHours: number;
  banThreshold: number;
};

const SANCTIONS_DEFAULTS: SanctionsConfig = {
  enabled: false,
  windowDays: 7,
  warnThreshold: 3,
  suspendThreshold: 5,
  suspendHours: 24,
  banThreshold: 10,
};

// يقرأ إعدادات العقوبات من مسودة JSON مع قيم افتراضية آمنة.
function readSanctionsConfig(draft: string | undefined): SanctionsConfig {
  if (!draft) return { ...SANCTIONS_DEFAULTS };
  try {
    const parsed = JSON.parse(draft) as Partial<SanctionsConfig>;
    const int = (value: unknown, fallback: number): number => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
    };
    return {
      enabled: Boolean(parsed?.enabled),
      windowDays: int(parsed?.windowDays, SANCTIONS_DEFAULTS.windowDays),
      warnThreshold: int(
        parsed?.warnThreshold,
        SANCTIONS_DEFAULTS.warnThreshold,
      ),
      suspendThreshold: int(
        parsed?.suspendThreshold,
        SANCTIONS_DEFAULTS.suspendThreshold,
      ),
      suspendHours: int(parsed?.suspendHours, SANCTIONS_DEFAULTS.suspendHours),
      banThreshold: int(parsed?.banThreshold, SANCTIONS_DEFAULTS.banThreshold),
    };
  } catch {
    return { ...SANCTIONS_DEFAULTS };
  }
}

// يضبط عدد صحيح غير سالب لمدخلات النافذة/العتبات/المدة.
function clampNonNegativeInt(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

// يكتب حقلًا واحدًا داخل إعدادات العقوبات ويعيد سلسلة JSON محدّثة.
function writeSanctionsField(
  draft: string | undefined,
  field: keyof SanctionsConfig,
  value: number | boolean,
): string {
  const cfg = readSanctionsConfig(draft);
  return JSON.stringify({ ...cfg, [field]: value });
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
    requestReview,
    discardDraft,
    openHistory,
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
                <div className="text-sm font-semibold">
                  {friendlySettingTitle(setting.key) ?? setting.key}
                </div>
                {isFriendlySetting(setting.key) ? <div className="mt-0.5 font-mono text-[11px] text-gray-400">{setting.key}</div> : null}
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
                  {setting.isPublic ? (
                    <span
                      className={
                        setting.publicationStatus === "PUBLISHED"
                          ? "rounded bg-emerald-100 px-2 py-0.5 text-emerald-700"
                          : "rounded bg-amber-100 px-2 py-0.5 text-amber-700"
                      }
                    >
                      {setting.publicationStatus === "PUBLISHED"
                        ? `منشور v${setting.publishedVersion}`
                        : "مسودة غير منشورة"}
                    </span>
                  ) : null}
                  {setting.changeRequests?.[0] ? (
                    <span className="rounded bg-violet-100 px-2 py-0.5 text-violet-700">
                      بانتظار موافقة ثانية
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {dateTime(setting.updatedAt)}
                </div>
              </div>
              {setting.key === DRIVER_PENALTY_KEY ? (
                <div className="flex flex-col justify-center gap-1">
                  <label className="text-xs text-gray-500">
                    نسبة غرامة إلغاء السائق من قيمة الرحلة الملغاة (0 = معطّلة)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={readPenaltyPct(drafts[setting.key])}
                      onChange={(event) =>
                        updateDraft(
                          setting.key,
                          JSON.stringify({
                            pct: clampPenaltyPct(event.target.value),
                          }),
                        )
                      }
                      className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    />
                    <span className="text-sm font-medium text-gray-500">%</span>
                  </div>
                </div>
              ) : setting.key === DRIVER_SANCTIONS_KEY ? (
                (() => {
                  const cfg = readSanctionsConfig(drafts[setting.key]);
                  const numField = (
                    label: string,
                    field: keyof SanctionsConfig,
                    hint?: string,
                  ) => (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">{label}</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={cfg[field] as number}
                        onChange={(event) =>
                          updateDraft(
                            setting.key,
                            writeSanctionsField(
                              drafts[setting.key],
                              field,
                              clampNonNegativeInt(event.target.value),
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                      />
                      {hint ? (
                        <span className="text-[11px] text-gray-400">{hint}</span>
                      ) : null}
                    </div>
                  );
                  return (
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={cfg.enabled}
                          onChange={(event) =>
                            updateDraft(
                              setting.key,
                              writeSanctionsField(
                                drafts[setting.key],
                                "enabled",
                                event.target.checked,
                              ),
                            )
                          }
                          className="h-4 w-4"
                        />
                        <span className="font-medium">
                          تفعيل نظام عقوبات الإلغاء التلقائي
                        </span>
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {numField(
                          "نافذة الاحتساب (أيام)",
                          "windowDays",
                          "الفترة التي تُحسب خلالها الإلغاءات",
                        )}
                        {numField(
                          "عتبة التحذير (إلغاءات)",
                          "warnThreshold",
                          "0 = تعطيل هذا المستوى",
                        )}
                        {numField(
                          "عتبة التعليق (إلغاءات)",
                          "suspendThreshold",
                          "0 = تعطيل هذا المستوى",
                        )}
                        {numField("مدة التعليق (ساعات)", "suspendHours")}
                        {numField(
                          "عتبة الحظر (إلغاءات)",
                          "banThreshold",
                          "0 = تعطيل هذا المستوى",
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">
                        يُطبَّق تلقائيًا وبالتصعيد: تحذير ← تعليق مؤقت يُرفع
                        تلقائيًا عند انتهاء مدته ← حظر دائم يحتاج رفعًا يدويًا.
                      </p>
                    </div>
                  );
                })()
              ) : isFriendlySetting(setting.key) ? (
                <FriendlyJsonEditor settingKey={setting.key} draft={drafts[setting.key]} onChange={(value) => updateDraft(setting.key, value)} />
              ) : (
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
              )}
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
                {setting.isPublic && setting.publicationStatus === "DRAFT" ? (
                  <>
                    <button
                      onClick={() => void requestReview(setting.key)}
                      disabled={
                        busyAction === `review:${setting.key}` ||
                        Boolean(setting.changeRequests?.[0])
                      }
                      className="rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 disabled:opacity-50"
                    >
                      {setting.changeRequests?.[0]
                        ? "بانتظار المراجعة"
                        : "طلب مراجعة ونشر"}
                    </button>
                    {setting.publishedVersion > 0 ? (
                      <button
                        onClick={() => void discardDraft(setting.key)}
                        disabled={busyAction === `discard:${setting.key}`}
                        className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-700 disabled:opacity-50"
                      >
                        إلغاء المسودة
                      </button>
                    ) : null}
                  </>
                ) : null}
                {setting.isPublic && setting.publishedVersion > 0 ? (
                  <button
                    onClick={() => openHistory(setting)}
                    className="rounded bg-violet-500/10 px-2 py-1 text-xs text-violet-700"
                  >
                    سجل النشر
                  </button>
                ) : null}
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
