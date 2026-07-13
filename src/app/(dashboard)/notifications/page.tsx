"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, Column } from "@/components/DataTable";
import { api } from "@/lib/api";
import { num, dateTime } from "@/lib/format";
import { Send } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

interface NotificationRow {
  id: string;
  target: string;
  channel: string;
  title: string;
  body: string;
  sentAt?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
}

const TARGETS = [
  { value: "ALL", label: "الجميع" },
  { value: "DRIVERS", label: "السائقون" },
  { value: "PASSENGERS", label: "الركاب" },
];

const CHANNELS = [
  { value: "PUSH", label: "إشعار (Push)" },
  { value: "IN_APP", label: "داخل التطبيق" },
  { value: "SMS", label: "رسالة نصية" },
  { value: "EMAIL", label: "بريد إلكتروني" },
];

const EMPTY = {
  target: "ALL",
  channel: "PUSH",
  title: "",
  body: "",
};

export default function NotificationsPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const canSendNotifications = can("notifications.send");

  const load = useCallback(() => {
    api
      .get("/notifications", { params: { page, limit: 20 } })
      .then((r) => {
        setRows(r.data.items ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => {});
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendNotification() {
    if (!canSendNotifications) return;
    setMsg("");
    if (!form.title.trim() || !form.body.trim()) {
      setMsg("العنوان والنص مطلوبان");
      return;
    }
    setSending(true);
    try {
      await api.post("/notifications", {
        target: form.target,
        channel: form.channel,
        title: form.title.trim(),
        body: form.body.trim(),
      });
      setForm(EMPTY);
      setMsg("تم الإرسال ✓");
      setPage(1);
      load();
    } catch {
      setMsg("تعذّر الإرسال");
    } finally {
      setSending(false);
    }
  }

  const targetLabel = (t: string) =>
    TARGETS.find((x) => x.value === t)?.label ?? t;

  const columns: Column<NotificationRow>[] = [
    { key: "title", header: "العنوان", render: (n) => <b>{n.title}</b> },
    { key: "body", header: "النص", render: (n) => n.body },
    { key: "target", header: "الفئة", render: (n) => targetLabel(n.target) },
    { key: "channel", header: "القناة", render: (n) => n.channel },
    {
      key: "status",
      header: "الحالة",
      render: (n) =>
        n.sentAt ? (
          <span className="text-xs text-green-500">أُرسل</span>
        ) : (
          <span className="text-xs text-amber-500">مجدول</span>
        ),
    },
    {
      key: "createdAt",
      header: "التاريخ",
      render: (n) => dateTime(n.sentAt ?? n.createdAt),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="الإشعارات" />
      <div className="space-y-6 p-6">
        {canSendNotifications ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-bold">إرسال إشعار</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900"
              >
                {TARGETS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900"
              >
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="العنوان"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 sm:col-span-2"
              />
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="نص الإشعار"
                rows={3}
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 sm:col-span-2"
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={sendNotification}
                disabled={sending}
                className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <Send size={16} /> إرسال
              </button>
              {msg ? <span className="text-xs text-gray-500">{msg}</span> : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <h2 className="text-lg font-bold">سجل الإشعارات</h2>
          <DataTable columns={columns} rows={rows} />
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>الإجمالي: {num(total)}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
              >
                السابق
              </button>
              <span className="px-2 py-1">
                {page} / {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
