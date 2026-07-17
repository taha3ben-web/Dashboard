"use client";

import { useRef, useState, type CSSProperties, type ChangeEvent } from "react";
import { ImageIcon, Trash2, Upload } from "lucide-react";

export interface IconValue {
  iconType: string;
  iconValue?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
  color?: string | null;
}

const MAX_IMAGE_BYTES = 600_000;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** اختيار صورة محلية وتحويلها إلى Data URL محفوظة مع الفئة/النوع. */
export function IconField({ value, onChange }: { value: IconValue; onChange: (v: IconValue) => void; showImage?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("الصيغة غير مدعومة. استخدم PNG أو JPG أو WebP أو SVG.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("حجم الصورة كبير. الحد الأقصى 600 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError("");
      onChange({ ...value, iconType: "PNG", iconValue: null, iconUrl: null, imageUrl: String(reader.result), color: value.color || "#4f46e5" });
    };
    reader.onerror = () => setError("تعذّرت قراءة الصورة من الجهاز.");
    reader.readAsDataURL(file);
  }

  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
      <div>
        <span className="mb-1 block text-sm font-medium">صورة الفئة أو نوع المركبة</span>
        <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} onChange={chooseImage} className="hidden" />
        <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-300">
          <Upload size={17} /> {value.imageUrl ? "استبدال الصورة" : "رفع صورة من الجهاز"}
        </button>
        <p className="mt-1 text-xs text-gray-400">PNG أو JPG أو WebP أو SVG — بحد أقصى 600 KB. لا حاجة إلى رابط خارجي.</p>
      </div>
      <label>
        <span className="mb-1 block text-sm font-medium">لون الخلفية</span>
        <input type="color" value={value.color || "#4f46e5"} onChange={(event) => onChange({ ...value, color: event.target.value })} className="h-11 w-16 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-700" />
      </label>
    </div>

    {error ? <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-300">{error}</div> : null}

    <div className="flex min-h-20 items-center gap-3 rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-700">
      <span className="text-xs text-gray-400">المعاينة:</span>
      <IconPreview value={value} size={52} />
      {value.imageUrl ? <button type="button" onClick={() => onChange({ ...value, iconType: "PNG", iconValue: null, iconUrl: null, imageUrl: null })} className="mr-auto flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"><Trash2 size={15} /> إزالة</button> : null}
    </div>
  </div>;
}

export function IconPreview({ value, size = 44 }: { value: IconValue; size?: number }) {
  const imgStyle: CSSProperties = { width: size, height: size, background: value.color || "#4f46e5" };
  const source = value.imageUrl || value.iconUrl;
  if (source) return <img src={source} alt="" className="rounded-lg object-contain" style={imgStyle} onError={(event) => { event.currentTarget.style.display = "none"; }} />;
  return <span className="flex items-center justify-center rounded-lg text-white" style={imgStyle}><ImageIcon size={Math.max(18, Math.round(size * 0.45))} /></span>;
}
