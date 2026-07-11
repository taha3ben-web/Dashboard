"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { api } from "@/lib/api";
import { AuditEntry, Paginated } from "@/lib/catalog";
import { dateTime } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  created: "إنشاء",
  updated: "تعديل",
  deleted: "أرشفة/حذف",
  restored: "استعادة",
  reordered: "إعادة ترتيب",
  status_changed: "تغيير الحالة",
  changed: "تعديل",
};

function labelFor(action: string): string {
  for (const key of Object.keys(ACTION_LABELS)) {
    if (action.endsWith(key)) return ACTION_LABELS[key];
  }
  return action;
}

/**
 * سجل التعديلات (Audit Log) لعنصر معين.
 * يجلب من GET /catalog/audit?entity=&entityId=
 */
export function AuditLog({
  entity,
  entityId,
}: {
  entity: string;
  entityId: string;
}) {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get<Paginated<AuditEntry>>("/catalog/audit", {
        params: { entity, entityId, page: 1, limit: 30 },
      })
      .then((r) => {
        if (alive) setItems(r.data.data ?? []);
      })
      .catch(() => {
        if (alive) setItems([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [entity, entityId]);

  if (loading)
    return <p className="py-4 text-center text-sm text-gray-400">جارٍ التحميل...</p>;
  if (items.length === 0)
    return (
      <p className="py-4 text-center text-sm text-gray-400">لا يوجد سجل بعد.</p>
    );

  return (
    <ul className="space-y-3">
      {items.map((e) => (
        <li key={e.id} className="flex gap-3 text-sm">
          <div className="mt-0.5 text-brand">
            <History size={16} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{labelFor(e.action)}</span>
              <span className="text-xs text-gray-400">{dateTime(e.createdAt)}</span>
            </div>
            <p className="text-xs text-gray-500">
              {e.actor?.name || "نظام"}
              {e.actor?.phone ? ` · ${e.actor.phone}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
