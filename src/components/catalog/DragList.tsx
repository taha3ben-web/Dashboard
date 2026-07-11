"use client";

import { ReactNode, useState } from "react";
import { GripVertical } from "lucide-react";
import clsx from "clsx";

export interface DragItem {
  id: string;
}

/**
 * قائمة قابلة لإعادة الترتيب بالسحب والإفلات (HTML5 الأصلي، دون مكتبات).
 * تستدعي onReorder بقائمة المعرّفات بالترتيب الجديد.
 */
export function DragList<T extends DragItem>({
  items,
  renderItem,
  onReorder,
  disabled,
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
  onReorder: (orderedIds: string[]) => void;
  disabled?: boolean;
}) {
  const [order, setOrder] = useState<T[]>(items);
  const [dragId, setDragId] = useState<string | null>(null);

  // مزامنة عند تغيّر المدخلات من الخارج.
  if (
    !dragId &&
    (order.length !== items.length ||
      order.some((o, i) => o.id !== items[i]?.id))
  ) {
    setOrder(items);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = order.findIndex((o) => o.id === dragId);
    const to = order.findIndex((o) => o.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    onReorder(next.map((n) => n.id));
  }

  return (
    <ul className="space-y-2">
      {order.map((item) => (
        <li
          key={item.id}
          draggable={!disabled}
          onDragStart={() => setDragId(item.id)}
          onDragEnd={() => setDragId(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(item.id)}
          className={clsx(
            "flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900",
            dragId === item.id && "opacity-50 ring-2 ring-brand",
            !disabled && "cursor-move",
          )}
        >
          {!disabled ? (
            <GripVertical size={18} className="shrink-0 text-gray-300" />
          ) : null}
          <div className="flex-1">{renderItem(item)}</div>
        </li>
      ))}
    </ul>
  );
}
