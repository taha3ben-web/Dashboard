"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, RefreshCcw } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api, getApiErrorMessage } from "@/lib/api";
import { dateTime, num } from "@/lib/format";

interface AdRow {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl?: string | null;
  campaignKey?: string | null;
  placement: string;
  appId?: string | null;
  clientOs?: string | null;
  countryCodes: string[];
  audienceSegments: string[];
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  priority: number;
  sortOrder: number;
  createdAt: string;
}

interface AdForm {
  id: string | null;
  title: string;
  imageUrl: string;
  targetUrl: string;
  campaignKey: string;
  placement: string;
  appId: string;
  clientOs: string;
  countryCodesText: string;
  audienceSegmentsText: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  priority: string;
  sortOrder: string;
}

const PLACEMENTS = ["PASSENGER_HOME", "PASSENGER_SEARCH", "DRIVER_HOME", "ALL"];

const EMPTY_FORM: AdForm = {
  id: null,
  title: "",
  imageUrl: "",
  targetUrl: "",
  campaignKey: "",
  placement: "PASSENGER_HOME",
  appId: "",
  clientOs: "",
  countryCodesText: "",
  audienceSegmentsText: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
  priority: "0",
  sortOrder: "0",
};

function parseCsv(text: string, casing: "upper" | "lower" = "lower") {
  return Array.from(
    new Set(
      text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) =>
          casing === "upper" ? item.toUpperCase() : item.toLowerCase(),
        ),
    ),
  );
}

export default function AdsPage() {
  const [rows, setRows] = useState<AdRow[]>([]);
  const [placement, setPlacement] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<AdForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/ads", {
        params: { placement: placement || undefined },
      });
      setRows(response.data ?? []);
    } catch (loadError) {
      setRows([]);
      setError(getApiErrorMessage(loadError, "تعذّر تحميل الإعلانات"));
    } finally {
      setLoading(false);
    }
  }, [placement]);

  useEffect(() => {
    void load();
  }, [load]);

  function editAd(row: AdRow) {
    setForm({
      id: row.id,
      title: row.title,
      imageUrl: row.imageUrl,
      targetUrl: row.targetUrl ?? "",
      campaignKey: row.campaignKey ?? "",
      placement: row.placement,
      appId: row.appId ?? "",
      clientOs: row.clientOs ?? "",
      countryCodesText: row.countryCodes.join(", "),
      audienceSegmentsText: row.audienceSegments.join(", "),
      isActive: row.isActive,
      startsAt: row.startsAt ? row.startsAt.slice(0, 16) : "",
      endsAt: row.endsAt ? row.endsAt.slice(0, 16) : "",
      priority: String(row.priority),
      sortOrder: String(row.sortOrder),
    });
  }

  async function saveAd() {
    setError("");
    setSuccess("");
    try {
      const payload = {
        title: form.title,
        imageUrl: form.imageUrl,
        targetUrl: form.targetUrl || undefined,
        campaignKey: form.campaignKey || undefined,
        placement: form.placement,
        appId: form.appId || undefined,
        clientOs: form.clientOs || undefined,
        countryCodes: parseCsv(form.countryCodesText, "upper"),
        audienceSegments: parseCsv(form.audienceSegmentsText, "lower"),
        isActive: form.isActive,
        startsAt: form.startsAt
          ? new Date(form.startsAt).toISOString()
          : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        priority: Number(form.priority || 0),
        sortOrder: Number(form.sortOrder || 0),
      };
      if (form.id) {
        await api.patch(`/ads/${form.id}`, payload);
        setSuccess("تم تحديث الإعلان بنجاح.");
      } else {
        await api.post("/ads", payload);
        setSuccess("تم إنشاء الإعلان بنجاح.");
      }
      setForm(EMPTY_FORM);
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر حفظ الإعلان"));
    }
  }

  async function toggleActive(row: AdRow) {
    try {
      await api.patch(`/ads/${row.id}`, { isActive: !row.isActive });
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر تحديث حالة الإعلان"));
    }
  }

  async function removeAd(id: string) {
    if (!window.confirm("تأكيد حذف الإعلان؟")) return;
    try {
      await api.delete(`/ads/${id}`);
      if (form.id === id) setForm(EMPTY_FORM);
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "تعذّر حذف الإعلان"));
    }
  }

  const columns: Column<AdRow>[] = [
    {
      key: "title",
      header: "الإعلان",
      render: (row) => (
        <div>
          <div className="font-medium">{row.title}</div>
          <div className="text-xs text-gray-500">
            {row.campaignKey || "بدون campaignKey"}
          </div>
        </div>
      ),
    },
    {
      key: "scope",
      header: "الاستهداف",
      render: (row) => (
        <div className="text-xs">
          <div>{row.placement}</div>
          <div className="text-gray-500">
            {row.appId || "all apps"} · {row.clientOs || "all os"}
          </div>
          <div className="text-gray-500">
            {row.countryCodes.length > 0
              ? row.countryCodes.join(" / ")
              : "all markets"}
          </div>
          <div className="text-gray-500">
            {row.audienceSegments.length > 0
              ? row.audienceSegments.join(" / ")
              : "all segments"}
          </div>
        </div>
      ),
    },
    {
      key: "priority",
      header: "الأولوية",
      render: (row) => (
        <div className="text-sm">
          <div>P{num(row.priority)}</div>
          <div className="text-xs text-gray-500">Sort {num(row.sortOrder)}</div>
        </div>
      ),
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (row) => (
        <StatusBadge status={row.isActive ? "ACTIVE" : "OFFLINE"} />
      ),
    },
    {
      key: "window",
      header: "النافذة",
      render: (row) => (
        <div className="text-xs">
          <div>من: {dateTime(row.startsAt)}</div>
          <div>إلى: {dateTime(row.endsAt)}</div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "إجراءات",
      render: (row) => (
        <div className="flex gap-1">
          <button
            onClick={() => editAd(row)}
            className="rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-600"
          >
            تعديل
          </button>
          <button
            onClick={() => void toggleActive(row)}
            className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-600"
          >
            {row.isActive ? "إيقاف" : "تفعيل"}
          </button>
          <button
            onClick={() => void removeAd(row.id)}
            className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-600"
          >
            حذف
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Topbar title="مركز الإعلانات والحملات" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="rounded-xl border border-pink-200 bg-pink-50 p-4 dark:border-pink-900/40 dark:bg-pink-950/20">
          <div className="flex items-center gap-2 text-pink-700 dark:text-pink-300">
            <Megaphone size={18} />
            <span className="font-medium">
              إدارة الإعلانات المركزية مع استهداف حسب التطبيق والسوق والشرائح
              وربط موحد عبر campaignKey.
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              {form.id ? "تعديل إعلان" : "إنشاء إعلان جديد"}
            </h2>
            {form.id ? (
              <button
                onClick={() => setForm(EMPTY_FORM)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
              >
                <RefreshCcw size={14} /> جديد
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="عنوان الإعلان"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <input
              value={form.imageUrl}
              onChange={(event) =>
                setForm({ ...form, imageUrl: event.target.value })
              }
              placeholder="رابط الصورة"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <input
              value={form.targetUrl}
              onChange={(event) =>
                setForm({ ...form, targetUrl: event.target.value })
              }
              placeholder="رابط التحويل"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <input
              value={form.campaignKey}
              onChange={(event) =>
                setForm({ ...form, campaignKey: event.target.value })
              }
              placeholder="campaignKey"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <select
              value={form.placement}
              onChange={(event) =>
                setForm({ ...form, placement: event.target.value })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            >
              {PLACEMENTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <input
              value={form.appId}
              onChange={(event) =>
                setForm({ ...form, appId: event.target.value })
              }
              placeholder="appId"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <input
              value={form.clientOs}
              onChange={(event) =>
                setForm({ ...form, clientOs: event.target.value })
              }
              placeholder="clientOs"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <input
              value={form.countryCodesText}
              onChange={(event) =>
                setForm({ ...form, countryCodesText: event.target.value })
              }
              placeholder="DZ, SA, AE"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <input
              value={form.audienceSegmentsText}
              onChange={(event) =>
                setForm({ ...form, audienceSegmentsText: event.target.value })
              }
              placeholder="vip, beta, new-users"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) =>
                setForm({ ...form, startsAt: event.target.value })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) =>
                setForm({ ...form, endsAt: event.target.value })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <input
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value })
              }
              placeholder="الأولوية"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <input
              value={form.sortOrder}
              onChange={(event) =>
                setForm({ ...form, sortOrder: event.target.value })
              }
              placeholder="الترتيب"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
            <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm({ ...form, isActive: event.target.checked })
                }
              />{" "}
              نشط
            </label>
            <button
              onClick={() => void saveAd()}
              disabled={!form.title || !form.imageUrl}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50 xl:col-span-4"
            >
              {form.id ? "حفظ التعديلات" : "إنشاء الإعلان"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={placement}
            onChange={(event) => setPlacement(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">كل المواضع</option>
            {PLACEMENTS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {success ? (
          <div className="text-sm text-emerald-600">{success}</div>
        ) : null}
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          empty="لا توجد إعلانات"
        />
      </div>
    </>
  );
}
