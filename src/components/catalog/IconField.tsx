"use client";

import { CSSProperties } from "react";
import { ICON_TYPES } from "@/lib/catalog";

export interface IconValue {
  iconType: string;
  iconValue?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
  color?: string | null;
}

/**
 * حقل اختيار الأيقونة/الصورة مع معاينة حية قبل الحفظ.
 */
export function IconField({
  value,
  onChange,
  showImage = true,
}: {
  value: IconValue;
  onChange: (v: IconValue) => void;
  showImage?: boolean;
}) {
  const set = (patch: Partial<IconValue>) => onChange({ ...value, ...patch });

  const previewImgStyle: CSSProperties = { width: 48, height: 48 };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-sm font-medium">نوع الأيقونة</span>
          <select
            value={value.iconType}
            onChange={(e) => set({ iconType: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            {ICON_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">اللون</span>
          <input
            type="color"
            value={value.color || "#4f46e5"}
            onChange={(e) => set({ color: e.target.value })}
            className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-700"
          />
        </label>
      </div>

      {value.iconType === "EMOJI" ? (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">الرمز (Emoji)</span>
          <input
            value={value.iconValue ?? ""}
            onChange={(e) => set({ iconValue: e.target.value })}
            placeholder="\ud83d\ude97"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      ) : (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">رابط الأيقونة (URL)</span>
          <input
            value={value.iconUrl ?? ""}
            onChange={(e) => set({ iconUrl: e.target.value })}
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      )}

      {showImage ? (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">صورة إضافية (URL)</span>
          <input
            value={value.imageUrl ?? ""}
            onChange={(e) => set({ imageUrl: e.target.value })}
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      ) : null}

      {/* معاينة حية */}
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-700">
        <span className="text-xs text-gray-400">معاينة:</span>
        <IconPreview value={value} />
        {showImage && value.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.imageUrl}
            alt="preview"
            style={previewImgStyle}
            className="rounded-lg object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : null}
      </div>
    </div>
  );
}

export function IconPreview({
  value,
  size = 44,
}: {
  value: IconValue;
  size?: number;
}) {
  const bg = value.color || "#4f46e5";
  const boxStyle: CSSProperties = { width: size, height: size, background: bg };
  const imgStyle: CSSProperties = { width: size, height: size };
  const emojiStyle: CSSProperties = {
    width: size,
    height: size,
    background: bg + "22",
  };

  if (value.iconType === "EMOJI") {
    return (
      <span
        className="flex items-center justify-center rounded-lg text-2xl"
        style={emojiStyle}
      >
        {value.iconValue || "\u2753"}
      </span>
    );
  }
  if (value.iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value.iconUrl}
        alt="icon"
        className="rounded-lg object-contain"
        style={imgStyle}
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-lg text-white"
      style={boxStyle}
    >
      ?
    </span>
  );
}
