"use client";

import { useEffect, useState } from "react";
import {
  Award,
  Car,
  Layers,
  MapPin,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import { money, num } from "@/lib/format";

interface TypeStat {
  vehicleTypeId: string;
  name: string;
  trips: number;
  revenue: number;
  avgFare: number;
  drivers: number;
}
interface Overview {
  generatedAt: string;
  totals: {
    categories: number;
    types: number;
    publishedTypes: number;
    pricingRules: number;
    features: number;
    serviceAreas: number;
  };
  perType: TypeStat[];
  mostUsed: TypeStat | null;
  leastUsed: TypeStat | null;
  mostProfitable: TypeStat | null;
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="rounded-lg bg-brand/10 p-2 text-brand">{icon}</div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
}

function Highlight({
  icon,
  title,
  stat,
  metric,
}: {
  icon: React.ReactNode;
  title: string;
  stat: TypeStat | null;
  metric: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-1 flex items-center gap-2 text-sm text-gray-400">
        {icon}
        {title}
      </div>
      {stat ? (
        <>
          <div className="font-bold">{stat.name}</div>
          <div className="text-sm text-gray-500">{metric}</div>
        </>
      ) : (
        <div className="text-sm text-gray-400">لا توجد بيانات كافية</div>
      )}
    </div>
  );
}

export default function CatalogAnalyticsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Overview>("/catalog/analytics")
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Topbar title="تحليلات الكتالوج" />
      <div className="space-y-4 p-4">
        {loading ? (
          <p className="py-10 text-center text-gray-400">جارٍ التحميل...</p>
        ) : !data ? (
          <p className="py-10 text-center text-gray-400">تعذّر تحميل التحليلات.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <StatCard icon={<Layers size={18} />} label="الفئات" value={num(data.totals.categories)} />
              <StatCard icon={<Car size={18} />} label="الأنواع" value={num(data.totals.types)} />
              <StatCard
                icon={<Sparkles size={18} />}
                label="المنشورة"
                value={num(data.totals.publishedTypes)}
              />
              <StatCard
                icon={<Award size={18} />}
                label="قواعد التسعير"
                value={num(data.totals.pricingRules)}
              />
              <StatCard
                icon={<Sparkles size={18} />}
                label="الميزات"
                value={num(data.totals.features)}
              />
              <StatCard
                icon={<MapPin size={18} />}
                label="مناطق الخدمة"
                value={num(data.totals.serviceAreas)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Highlight
                icon={<TrendingUp size={16} />}
                title="الأكثر استخدامًا"
                stat={data.mostUsed}
                metric={data.mostUsed ? `${num(data.mostUsed.trips)} رحلة` : ""}
              />
              <Highlight
                icon={<TrendingDown size={16} />}
                title="الأقل استخدامًا"
                stat={data.leastUsed}
                metric={data.leastUsed ? `${num(data.leastUsed.trips)} رحلة` : ""}
              />
              <Highlight
                icon={<Award size={16} />}
                title="الأعلى إيرادًا"
                stat={data.mostProfitable}
                metric={data.mostProfitable ? money(data.mostProfitable.revenue) : ""}
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <h3 className="border-b border-gray-200 p-4 font-bold dark:border-gray-800">
                الأداء حسب النوع
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="border-b border-gray-200 text-xs text-gray-400 dark:border-gray-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">النوع</th>
                      <th className="px-4 py-3 font-medium">الرحلات</th>
                      <th className="px-4 py-3 font-medium">الإيراد</th>
                      <th className="px-4 py-3 font-medium">متوسط الأجرة</th>
                      <th className="px-4 py-3 font-medium">السائقون</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.perType.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-gray-400">
                          لا توجد بيانات.
                        </td>
                      </tr>
                    ) : (
                      data.perType.map((t) => (
                        <tr
                          key={t.vehicleTypeId}
                          className="border-b border-gray-100 last:border-0 dark:border-gray-800/60"
                        >
                          <td className="px-4 py-3 font-medium">{t.name}</td>
                          <td className="px-4 py-3 text-gray-500">{num(t.trips)}</td>
                          <td className="px-4 py-3 text-gray-500">{money(t.revenue)}</td>
                          <td className="px-4 py-3 text-gray-500">{money(t.avgFare)}</td>
                          <td className="px-4 py-3 text-gray-500">{num(t.drivers)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
