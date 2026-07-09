"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { num, dateTime } from "@/lib/format";

interface Ticket {
  id: string;
  subject: string;
  category?: string | null;
  status: string;
  createdAt: string;
  user?: { name: string; phone: string };
}

interface Complaint {
  id: string;
  message: string;
  status: string;
  createdAt: string;
  fromUser?: { name: string; phone: string };
  againstUser?: { name: string; phone: string } | null;
}

type Tab = "tickets" | "complaints";

const TICKET_STATUSES = ["OPEN", "PENDING", "RESOLVED", "CLOSED"];
const COMPLAINT_STATUSES = ["OPEN", "REVIEWING", "RESOLVED"];

export default function SupportPage() {
  const [tab, setTab] = useState<Tab>("tickets");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    if (tab === "tickets") {
      api
        .get("/support/tickets", { params: { page, limit: 20 } })
        .then((r) => {
          setTickets(r.data.items ?? []);
          setTotal(r.data.total ?? 0);
        })
        .catch(() => {});
    } else {
      api
        .get("/support/complaints", { params: { page, limit: 20 } })
        .then((r) => {
          setComplaints(r.data.items ?? []);
          setTotal(r.data.total ?? 0);
        })
        .catch(() => {});
    }
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function setTicketStatus(id: string, status: string) {
    await api.patch(`/support/tickets/${id}/status`, { status });
    load();
  }

  async function setComplaintStatus(id: string, status: string) {
    await api.patch(`/support/complaints/${id}/status`, { status });
    load();
  }

  const ticketColumns: Column<Ticket>[] = [
    { key: "subject", header: "الموضوع", render: (t) => <b>{t.subject}</b> },
    { key: "user", header: "المستخدم", render: (t) => t.user?.name ?? "-" },
    { key: "category", header: "التصنيف", render: (t) => t.category ?? "-" },
    {
      key: "status",
      header: "الحالة",
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: "createdAt",
      header: "التاريخ",
      render: (t) => dateTime(t.createdAt),
    },
    {
      key: "actions",
      header: "تغيير الحالة",
      render: (t) => (
        <select
          value={t.status}
          onChange={(e) => setTicketStatus(t.id, e.target.value)}
          className="rounded border border-gray-300 bg-transparent px-2 py-1 text-xs outline-none dark:border-gray-700 dark:bg-gray-900"
        >
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
  ];

  const complaintColumns: Column<Complaint>[] = [
    { key: "message", header: "الشكوى", render: (c) => c.message },
    { key: "from", header: "من", render: (c) => c.fromUser?.name ?? "-" },
    { key: "against", header: "ضد", render: (c) => c.againstUser?.name ?? "-" },
    {
      key: "status",
      header: "الحالة",
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "createdAt",
      header: "التاريخ",
      render: (c) => dateTime(c.createdAt),
    },
    {
      key: "actions",
      header: "تغيير الحالة",
      render: (c) => (
        <select
          value={c.status}
          onChange={(e) => setComplaintStatus(c.id, e.target.value)}
          className="rounded border border-gray-300 bg-transparent px-2 py-1 text-xs outline-none dark:border-gray-700 dark:bg-gray-900"
        >
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  function switchTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  return (
    <>
      <Topbar title="الدعم والشكاوى" />
      <div className="space-y-4 p-6">
        <div className="flex gap-2">
          <button
            onClick={() => switchTab("tickets")}
            className={
              tab === "tickets"
                ? "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
                : "rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            }
          >
            تذاكر الدعم
          </button>
          <button
            onClick={() => switchTab("complaints")}
            className={
              tab === "complaints"
                ? "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
                : "rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            }
          >
            الشكاوى
          </button>
        </div>

        {tab === "tickets" ? (
          <DataTable columns={ticketColumns} rows={tickets} />
        ) : (
          <DataTable columns={complaintColumns} rows={complaints} />
        )}

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
    </>
  );
}
