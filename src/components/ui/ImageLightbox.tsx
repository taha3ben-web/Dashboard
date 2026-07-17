"use client";

import { Modal } from "./Modal";

/**
 * عارض صور داخل مودال لوحة التحكم — يفتح صور الوثائق داخل الصفحة
 * بدل الانتقال إلى صفحة/تبويب آخر.
 */
export function ImageLightbox({
  open,
  onClose,
  src,
  title,
}: {
  open: boolean;
  onClose: () => void;
  src: string | null | undefined;
  title: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      {src ? (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title}
            className="max-h-[70vh] w-auto rounded-lg object-contain"
          />
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-gray-400">لا توجد صورة.</p>
      )}
    </Modal>
  );
}
