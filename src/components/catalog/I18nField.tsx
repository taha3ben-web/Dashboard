"use client";

import { useState } from "react";
import clsx from "clsx";
import { LOCALES, LocaleCode } from "@/lib/catalog";

/**
 * حقل متعدد اللغات (عربي/فرنسي/إنجليزي) بتبويب.
 * يدير قاموس { ar, fr, en }. القيمة العربية تستخدم كاسم أساسي (name).
 */
export function I18nField({
  label,
  value,
  onChange,
  textarea,
  required,
  placeholder,
}: {
  label: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  textarea?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const [tab, setTab] = useState<LocaleCode>("ar");
  const set = (code: string, v: string) => onChange({ ...value, [code]: v });

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
        <div className="flex gap-1">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setTab(l.code)}
              className={clsx(
                "rounded-md px-2 py-0.5 text-xs font-medium transition",
                tab === l.code
                  ? "bg-brand text-white"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800",
                value[l.code]?.trim() && tab !== l.code && "ring-1 ring-brand/40",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      {LOCALES.map((l) =>
        tab === l.code ? (
          textarea ? (
            <textarea
              key={l.code}
              dir={l.dir}
              value={value[l.code] ?? ""}
              placeholder={placeholder}
              onChange={(e) => set(l.code, e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900"
            />
          ) : (
            <input
              key={l.code}
              dir={l.dir}
              value={value[l.code] ?? ""}
              placeholder={placeholder}
              onChange={(e) => set(l.code, e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900"
            />
          )
        ) : null,
      )}
      <p className="mt-1 text-[11px] text-gray-400">
        العربية إلزامية؛ الفرنسية والإنجليزية اختياريتان (تظهران حسب لغة التطبيق).
      </p>
    </div>
  );
}
