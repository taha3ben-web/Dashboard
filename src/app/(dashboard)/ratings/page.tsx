"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Star, Users, MessageSquare } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { num, dateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

interface RatingRow {
  id: string;
  tripId: string;
  stars: number;
  comment?: string | null;
  createdAt: string;
  author?: { name?: string };
  target?: { name?: string };
  trip?: { id: string };
}

const STAR_FILTERS = ["", "5", "4", "3", "2", "1"];

function Stars({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-medium text-amber-500"
      title={`${value} / 5`}
    >
      <Star size={14} className="fill-amber-400 text-amber-400" />
      {value}
    </span>
  );
}

export default function RatingsPage() {
  const { can } = useAuth();
  const canManage = can("support.manage");
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stars, setStars] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!canManage) return;
    setError("");
    const params: Record<string, string | number> = { page, limit: 20 };
    if (stars) params.stars = stars;
    api
      .get("/ratings", { params })
      .then((r) => {
        setRows(r.data.items ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch((loadError) => {
        setRows([]);
        setTotal(0);
        setError(
          loadError instanceof Error ? loadError.message : "تعذّر تحميل التقييمات",
        );
      });
  }, [canManage, page, stars]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageAverage = useMemo(() => {
    if (rows.length === 0) return 0;
    const sum = rows.reduce((acc, row) => acc + (row.stars ?? 0), 0);
    return Math.round((sum / rows.length) * 100) / 100;
  }, [rows]);

  const withComments = useMemo(
    () => rows.filter((row) => row.comment && row.comment.trim().length > 0).length,
    [rows],
  );

  const columns: Column<RatingRow>[] = [
    {
      key: "trip",
      header: "الرحلة",
      render: (r) => (
        <span className="font-mono text-xs">{r.tripId.slice(0, 8)}</span>
      ),
    },
    {
      key: "author",
      header: "المُقيِّم",
      render: (r) => r.author?.name ?? "-",
    },
    {
      key: "target",
      header: "المُقيَّم عليه",
      render: (r) => r.target?.name ?? "-",
    },
    {
      key: "stars",
      header: "التقييم",
      render: (r) => <Stars value={r.stars} />,
    },
    {
      key: "comment",
      header: "التعليق",
      render: (r) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {r.comment && r.comment.trim().length > 0 ? r.comment : "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "الوقت",
      render: (r) => dateTime(r.createdAt),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="التقييمات" />
      <div className="space-y-4 p-6">
        {!canManage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            تتطلّب مطالعة التقييمات صلاحية إدارة الدعم.
          </div>
        ) : null}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
          يُقيّم الراكب والسائق بعضهما بعد اكتمال الرحلة (نجوم + تعليق)،
          ويُعاد حساب متوسّط تقييم السائق تلقائيًا. تعرض هذه الصفحة كل التقييمات
          مع إمكانية الفلترة بعدد النجوم.
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="إجمالي التقييمات"
            value={num(total)}
            icon={<Star size={18} />}
          />
          <StatCard
            label="متوسّط الصفحة"
            value={pageAverage}
            icon={<Users size={18} />}
            accent="green"
          />
          <StatCard
            label="تحمل تعليقًا"
            value={num(withComments)}
            icon={<MessageSquare size={18} />}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={stars}
            onChange={(e) => {
              setPage(1);
              setStars(e.target.value);
            }}
            className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900"
          >
            {STAR_FILTERS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? `${s} نجوم` : "كل التقييمات"}
              </option>
            ))}
          </select>
        </div>

        {error ? <div className="text-sm text-red-500">{error}</div> : null}

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
    </>
  );
}
