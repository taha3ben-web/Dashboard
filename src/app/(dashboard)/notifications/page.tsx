"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DataTable, type Column } from "@/components/DataTable";
import { api, getApiErrorMessage } from "@/lib/api";
import { num, dateTime } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

type NotificationChannel = "PUSH" | "IN_APP" | "SMS" | "EMAIL";
type NotificationTarget = "ALL" | "DRIVERS" | "PASSENGERS" | "USER";

interface City {
  id: string;
  name: string;
  isActive: boolean;
}

interface NotificationRow {
  id: string;
  target: NotificationTarget;
  channel: NotificationChannel;
  campaignKey?: string | null;
  appId?: string | null;
  clientOs?: string | null;
  countryCodes: string[];
  localeCodes: string[];
  driverCityIds: string[];
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  sentCount: number;
  sentAt?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
}

const TARGETS = [
  { value: "ALL", label: "الجميع" },
  { value: "DRIVERS", label: "السائقون" },
  { value: "PASSENGERS", label: "الركاب" },
  { value: "USER", label: "مستخدم محدد" },
] as const;

const CHANNELS = [
  { value: "PUSH", label: "إشعار Push" },
  { value: "IN_APP", label: "داخل التطبيق" },
  { value: "SMS", label: "رسالة نصية" },
  { value: "EMAIL", label: "بريد إلكتروني" },
] as const;

const EMPTY_FORM = {
  target: "ALL" as NotificationTarget,
  channel: "PUSH" as NotificationChannel,
  userId: "",
  campaignKey: "",
  appId: "",
  clientOs: "",
  countryCodesText: "",
  localeCodesText: "",
  driverCityIds: [] as string[],
  title: "",
  body: "",
  imageUrl: "",
  deepLink: "",
  scheduledAt: "",
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

export default function NotificationsPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const canSendNotifications = can("notifications.send");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [notificationsResponse, citiesResponse] = await Promise.all([
        api.get("/notifications", { params: { page, limit: 20 } }),
        api.get("/cities"),
      ]);
      setRows(notificationsResponse.data.items ?? []);
      setTotal(notificationsResponse.data.total ?? 0);
      setCities(citiesResponse.data ?? []);
    } catch (error) {
      setMsg(getApiErrorMessage(error, "تعذّر تحميل مركز الحملات"));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendNotification() {
    if (!canSendNotifications) return;
    setMsg("");
    if (!form.title.trim() || !form.body.trim()) {
      setMsg("العنوان والنص مطلوبان");
      return;
    }
    if (form.target === "USER" && !form.userId.trim()) {
      setMsg("مع هدف مستخدم محدد يجب إدخال userId");
      return;
    }
    setSending(true);
    try {
      await api.post("/notifications", {
        target: form.target,
        channel: form.channel,
        userId: form.target === "USER" ? form.userId.trim() : undefined,
        campaignKey: form.campaignKey.trim() || undefined,
        appId: form.appId.trim() || undefined,
        clientOs: form.clientOs.trim() || undefined,
        countryCodes: parseCsv(form.countryCodesText, "upper"),
        localeCodes: parseCsv(form.localeCodesText, "lower"),
        driverCityIds:
          form.target === "DRIVERS" ? form.driverCityIds : undefined,
        title: form.title.trim(),
        body: form.body.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        deepLink: form.deepLink.trim() || undefined,
        scheduledAt: form.scheduledAt
          ? new Date(form.scheduledAt).toISOString()
          : undefined,
      });
      setForm(EMPTY_FORM);
      setMsg("تم إنشاء الحملة وإرسالها/جدولتها بنجاح ✓");
      setPage(1);
      await load();
    } catch (error) {
      setMsg(getApiErrorMessage(error, "تعذّر إنشاء الحملة"));
    } finally {
      setSending(false);
    }
  }

  function toggleCity(cityId: string) {
    setForm((current) => ({
      ...current,
      driverCityIds: current.driverCityIds.includes(cityId)
        ? current.driverCityIds.filter((id) => id !== cityId)
        : [...current.driverCityIds, cityId],
    }));
  }

  const cityMap = useMemo(
    () => Object.fromEntries(cities.map((city) => [city.id, city.name])),
    [cities],
  );

  const targetLabel = (target: string) =>
    TARGETS.find((item) => item.value === target)?.label ?? target;
  const channelLabel = (channel: string) =>
    CHANNELS.find((item) => item.value === channel)?.label ?? channel;

  const columns: Column<NotificationRow>[] = [
    {
      key: "campaign",
      header: "الحملة",
      render: (row) => (
        <div>
          <div className="font-semibold">{row.title}</div>
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
        <div className="max-w-72 text-xs">
          <div>
            {targetLabel(row.target)} · {channelLabel(row.channel)}
          </div>
          <div className="text-gray-500">
            {row.appId || "كل التطبيقات"} · {row.clientOs || "كل الأنظمة"}
          </div>
          <div className="text-gray-500">
            {row.countryCodes.length > 0
              ? row.countryCodes.join(" / ")
              : "كل الأسواق"}
            {row.localeCodes.length > 0
              ? ` · ${row.localeCodes.join(" / ")}`
              : ""}
          </div>
          {row.driverCityIds.length > 0 ? (
            <div className="text-gray-500">
              المدن:{" "}
              {row.driverCityIds.map((id) => cityMap[id] ?? id).join(" / ")}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "body",
      header: "النص",
      render: (row) => (
        <div className="flex max-w-80 items-start gap-2">
          {row.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.imageUrl}
              alt=""
              className="h-10 w-10 flex-shrink-0 rounded-md object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          <div className="text-sm">{row.body}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (row) => (
        <div className="text-xs">
          <div className={row.sentAt ? "text-emerald-600" : "text-amber-600"}>
            {row.sentAt ? "أُرسل" : "مجدول"}
          </div>
          <div className="text-gray-500">وصل إلى {num(row.sentCount)}</div>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "التاريخ",
      render: (row) => (
        <div className="text-xs">
          <div>{dateTime(row.sentAt ?? row.createdAt)}</div>
          {row.scheduledAt ? (
            <div className="text-gray-500">
              جدولة: {dateTime(row.scheduledAt)}
            </div>
          ) : null}
        </div>
      ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <Topbar title="مركز الحملات والإشعارات" />
      <div className="space-y-6 p-4 sm:p-6">
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200">
          أنشئ رسالة فورية أو داخل التطبيق أو رسالة نصية أو بريدًا إلكترونيًا، ثم اختر الجمهور وموعد الإرسال.
        </section>

        {canSendNotifications ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-bold">إنشاء حملة جديدة</h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
              <select
                value={form.target}
                onChange={(e) =>
                  setForm({
                    ...form,
                    target: e.target.value as NotificationTarget,
                  })
                }
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              >
                {TARGETS.map((target) => (
                  <option key={target.value} value={target.value}>
                    {target.label}
                  </option>
                ))}
              </select>
              <select
                value={form.channel}
                onChange={(e) =>
                  setForm({
                    ...form,
                    channel: e.target.value as NotificationChannel,
                  })
                }
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              >
                {CHANNELS.map((channel) => (
                  <option key={channel.value} value={channel.value}>
                    {channel.label}
                  </option>
                ))}
              </select>
              <input
                value={form.campaignKey}
                onChange={(e) =>
                  setForm({ ...form, campaignKey: e.target.value })
                }
                placeholder="مفتاح الحملة (اختياري)"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) =>
                  setForm({ ...form, scheduledAt: e.target.value })
                }
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              {form.target === "USER" ? (
                <input
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  placeholder="معرّف المستخدم"
                  className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                />
              ) : null}
              <input
                value={form.appId}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
                placeholder="معرّف التطبيق (اختياري)"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <input
                value={form.clientOs}
                onChange={(e) => setForm({ ...form, clientOs: e.target.value })}
                placeholder="نظام التشغيل (اختياري)"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <input
                value={form.countryCodesText}
                onChange={(e) =>
                  setForm({ ...form, countryCodesText: e.target.value })
                }
                placeholder="DZ, SA, AE"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <input
                value={form.localeCodesText}
                onChange={(e) =>
                  setForm({ ...form, localeCodesText: e.target.value })
                }
                placeholder="ar, fr, en"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
              />
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="عنوان الرسالة"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 xl:col-span-2"
              />
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="نص الحملة"
                rows={3}
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 xl:col-span-4"
              />
              <input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="رابط صورة الإشعار (https://...)"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 xl:col-span-2"
              />
              <input
                value={form.deepLink}
                onChange={(e) => setForm({ ...form, deepLink: e.target.value })}
                placeholder="رابط داخلي عند الضغط (deep link)"
                className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 xl:col-span-2"
              />
            </div>

            {form.imageUrl.trim() ? (
              <div className="mt-3">
                <div className="mb-2 text-sm font-medium">معاينة صورة الإشعار</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl.trim()}
                  alt="معاينة صورة الإشعار"
                  className="max-h-48 rounded-lg border border-gray-200 object-cover dark:border-gray-800"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              </div>
            ) : null}

            {form.target === "DRIVERS" ? (
              <div className="mt-3">
                <div className="mb-2 text-sm font-medium">
                  مدن السائقين المستهدفة
                </div>
                <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3 md:grid-cols-2 dark:border-gray-800">
                  {cities.map((city) => (
                    <label
                      key={city.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.driverCityIds.includes(city.id)}
                        onChange={() => toggleCity(city.id)}
                      />
                      {city.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => void sendNotification()}
                disabled={sending}
                className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <Send size={16} />{" "}
                {sending ? "جارٍ الإرسال..." : "إطلاق الحملة"}
              </button>
              {msg ? (
                <span className="text-xs text-gray-500">{msg}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <h2 className="text-lg font-bold">سجل الحملات</h2>
          <DataTable columns={columns} rows={rows} loading={loading} />
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>الإجمالي: {num(total)}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
              >
                السابق
              </button>
              <span className="px-2 py-1">
                {page} / {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((current) => current + 1)}
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
