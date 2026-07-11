"use client";

import clsx from "clsx";

/** مفتاح تبديل (تفعيل/إيقاف) متجاوب. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50",
          checked ? "bg-brand" : "bg-gray-300 dark:bg-gray-700",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "left-0.5" : "right-0.5",
          )}
        />
      </button>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
