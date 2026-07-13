"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/providers/AuthProvider";
import { canAccessPath } from "@/lib/permissions";
import {
  LayoutDashboard,
  Car,
  Users,
  Route,
  Map,
  Wallet,
  HandCoins,
  ArrowRightLeft,
  Briefcase,
  Ticket,
  Bell,
  Activity,
  LifeBuoy,
  Settings,
  Smartphone,
  Layers,
  Sparkles,
  MapPin,
  DollarSign,
  BarChart3,
  BookOpen,
  Boxes,
  CreditCard,
  ShieldAlert,
  Bot,
  Megaphone,
  KeyRound,
} from "lucide-react";

const LINKS = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/drivers", label: "السائقون", icon: Car },
  { href: "/passengers", label: "الركاب", icon: Users },
  { href: "/trips", label: "الرحلات", icon: Route },
  { href: "/live-map", label: "الخريطة الحية", icon: Map },
  { href: "/earnings", label: "الأرباح", icon: Wallet },
  { href: "/wallets", label: "الحسابات المالية", icon: BookOpen },
  { href: "/driver-funding", label: "شحن السائقين", icon: HandCoins },
  { href: "/driver-transfers", label: "تحويلات السائقين", icon: ArrowRightLeft },
  { href: "/withdrawals", label: "السحوبات", icon: Briefcase },
  { href: "/financial-dashboard", label: "لوحة المالية", icon: Wallet },
  { href: "/financial-control", label: "المطابقة والتسوية", icon: ShieldAlert },
  { href: "/payments", label: "المدفوعات", icon: CreditCard },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/coupons", label: "الكوبونات", icon: Ticket },
  { href: "/notifications", label: "الإشعارات", icon: Bell },
  { href: "/operations", label: "العمليات والمراقبة", icon: Activity },
  { href: "/agents", label: "الوكلاء", icon: Bot },
  { href: "/ads", label: "الإعلانات", icon: Megaphone },
  { href: "/access-control", label: "الوصول والأدوار", icon: KeyRound },
  { href: "/security-center", label: "مركز الأمان", icon: ShieldAlert },
  { href: "/safety", label: "السلامة", icon: ShieldAlert },
  { href: "/support", label: "الدعم الفني", icon: LifeBuoy },
  { href: "/app-versions", label: "إصدارات التطبيق", icon: Smartphone },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

// قسم الكتالوج (التحكم الديناميكي بالمركبات دون تحديث التطبيقات).
const CATALOG_LINKS = [
  { href: "/catalog/categories", label: "الفئات", icon: Layers },
  { href: "/catalog/vehicle-types", label: "الأنواع", icon: Car },
  { href: "/catalog/features", label: "الميزات", icon: Sparkles },
  { href: "/catalog/service-areas", label: "مناطق الخدمة", icon: MapPin },
  { href: "/catalog/pricing", label: "التسعير", icon: DollarSign },
  { href: "/catalog/analytics", label: "التحليلات", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { permissions } = useAuth();

  const linkClass = (active: boolean) =>
    clsx(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
      active
        ? "bg-brand text-white"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
    );

  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:block">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand font-bold text-white">
          N
        </div>
        <span className="text-lg font-bold">NOVA Ride</span>
      </div>
      <nav className="space-y-1">
        {LINKS.filter((link) => canAccessPath(link.href, permissions)).map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href} className={linkClass(active)}>
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}

        {/* قسم الكتالوج */}
        <div className="pt-4">
          <div className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <Boxes size={14} />
            الكتالوج
          </div>
          {CATALOG_LINKS.filter((link) => canAccessPath(link.href, permissions)).map((link) => {
            const Icon = link.icon;
            const active = pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className={linkClass(active)}>
                <Icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
