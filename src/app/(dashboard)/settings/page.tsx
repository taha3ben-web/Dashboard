"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { Save } from "lucide-react";

interface Setting {
  id: string;
  key: string;
  value: unknown;
  group?: string | null;
  updatedAt: string;
}

interface City {
  id: string;
  name: string;
  country?: string | null;
  isActive: boolean;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function parseValue(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return text;
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cities, setCities] = useState<City[]>([]);
  const [savedKey, setSavedKey] = useState("");

  const load = useCallback(() => {
    api
      .get("/settings")
      .then((r) => {
        const list: Setting[] = r.data ?? [];
        setSettings(list);
        const map: Record<string, string> = {};
        for (const s of list) map[s.key] = toText(s.value);
        setDrafts(map);
      })
      .catch(() => {});
    api
      .get("/cities")
      .then((r) => setCities(r.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(key: string) {
    await api.put(`/settings/${encodeURIComponent(key)}`, {
      value: parseValue(drafts[key] ?? ""),
    });
    setSavedKey(key);
    setTimeout(() => setSavedKey(""), 1500);
    load();
  }

  const cityColumns: Column<City>[] = [
    { key: "name", header: "المدينة", render: (c) => <b>{c.name}</b> },
    { key: "country", header: "الدولة", render: (c) => c.country ?? "-" },
    {
      key: "isActive",
      header: "الحالة",
      render: (c) => <StatusBadge status={c.isActive ? "ACTIVE" : "OFFLINE"} />,
    },
  ];

  return (
    <>
      <Topbar title="الإعدادات" />
      <div className="space-y-8 p-6">
        <section className="space-y-3">
          <h2 className="text-lg font-bold">إعدادات النظام</h2>
          {settings.length === 0 ? (
            <p className="text-sm text-gray-500">
              لا توجد إعدادات بعد. تُضاف من الخادم أو عبر التهيئة الأولية.
            </p>
          ) : (
            <div className="space-y-2">
              {settings.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="min-w-40">
                    <div className="text-sm font-medium">{s.key}</div>
                    {s.group ? (
                      <div className="text-xs text-gray-400">{s.group}</div>
                    ) : null}
                  </div>
                  <input
                    value={drafts[s.key] ?? ""}
                    onChange={(e) =>
                      setDrafts({ ...drafts, [s.key]: e.target.value })
                    }
                    className="flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700"
                  />
                  <button
                    onClick={() => save(s.key)}
                    className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white"
                  >
                    <Save size={14} />
                    {savedKey === s.key ? "تم ✓" : "حفظ"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">المدن</h2>
          <DataTable columns={cityColumns} rows={cities} />
        </section>
      </div>
    </>
  );
}
