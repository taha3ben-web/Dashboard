"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/providers/AuthProvider";
import { canAccessPath } from "@/lib/permissions";
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Boxes,
  Briefcase,
  Car,
  CreditCard,
  DollarSign,
  HandCoins,
  KeyRound,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Map,
  MapPin,
  Megaphone,
  Route,
  Settings,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "نظرة عامة",
    items: [
      { href: "/", label: "مركز التحكم", icon: LayoutDashboard },
      { href: "/operations", label: "العمليات والمراقبة", icon: Activity },
      { href: "/live-map", label: "الخريطة الحية", icon: Map },
    ],
  },
  {
    label: "التشغيل",
    items: [
      { href: "/drivers", label: "السائقون", icon: Car },
      { href: "/passengers", label: "الركاب", icon: Users },
      { href: "/trips", label: "الرحلات", icon: Route },
      { href: "/support", label: "الدعم الفني", icon: LifeBuoy },
      { href: "/safety", label: "السلامة", icon: ShieldAlert },
      { href: "/agents", label: "الوكلاء", icon: Bot },
    ],
  },
  {
    label: "المالية",
    items: [
      { href: "/financial-dashboard", label: "لوحة المالية", icon: Wallet },
      { href: "/payments", label: "المدفوعات", icon: CreditCard },
      { href: "/wallets", label: "الحسابات المالية", icon: BookOpen },
      { href: "/earnings", label: "الأرباح", icon: DollarSign },
      { href: "/driver-funding", label: "شحن السائقين", icon: HandCoins },
      {
        href: "/driver-transfers",
        label: "تحويلات السائقين",
        icon: ArrowRightLeft,
      },
      { href: "/withdrawals", label: "السحوبات", icon: Briefcase },
      {
        href: "/financial-control",
        label: "المطابقة والتسوية",
        icon: ShieldAlert,
      },
      { href: "/financial-transactions", label: "قيود الدفتر", icon: BookOpen },
      { href: "/reports", label: "التقارير", icon: BarChart3 },
    ],
  },
  {
    label: "النمو والتواصل",
    items: [
      { href: "/coupons", label: "الكوبونات", icon: Ticket },
      { href: "/notifications", label: "الإشعارات", icon: Bell },
      { href: "/ads", label: "الإعلانات", icon: Megaphone },
      { href: "/app-versions", label: "إصدارات التطبيق", icon: Smartphone },
    ],
  },
  {
    label: "الإدارة والأمان",
    items: [
      { href: "/access-control", label: "الوصول والأدوار", icon: KeyRound },
      { href: "/security-center", label: "مركز الأمان", icon: ShieldAlert },
      { href: "/settings", label: "الإعدادات", icon: Settings },
    ],
  },
  {
    label: "كتالوج الخدمات",
    items: [
      { href: "/catalog/categories", label: "الفئات", icon: Layers },
      { href: "/catalog/vehicle-types", label: "أنواع المركبات", icon: Car },
      { href: "/catalog/features", label: "الميزات", icon: Sparkles },
      { href: "/catalog/service-areas", label: "مناطق الخدمة", icon: MapPin },
      { href: "/catalog/pricing", label: "التسعير", icon: DollarSign },
      {
        href: "/catalog/analytics",
        label: "تحليلات الكتالوج",
        icon: BarChart3,
      },
    ],
  },
];

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({ mobile = false, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { permissions, profile } = useAuth();
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessPath(item.href, permissions)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={clsx(
        "flex h-full w-full flex-col border-l border-slate-200/80 bg-white dark:border-gray-800 dark:bg-gray-900",
        mobile
          ? "shadow-2xl"
          : "fixed inset-y-0 right-0 z-40 hidden w-72 md:flex",
      )}
    >
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5 dark:border-gray-800">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 text-lg font-black text-white shadow-lg shadow-indigo-500/20">
            N
          </div>
          <div>
            <div className="font-black tracking-tight text-slate-900 dark:text-white">
              NOVA Ride
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Control Center
            </div>
          </div>
        </Link>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        ) : null}
      </div>

      <nav className="nova-scrollbar flex-1 space-y-6 overflow-y-auto px-4 py-5">
        {groups.map((group) => (
          <section key={group.label}>
            <div className="mb-2 flex items-center gap-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              <Boxes size={12} />
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={clsx(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                      active
                        ? "bg-gradient-to-l from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/15"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
                    )}
                  >
                    <Icon
                      size={18}
                      className={clsx(
                        "shrink-0 transition-transform group-hover:scale-105",
                        active ? "text-white" : "text-slate-400",
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-100 p-4 dark:border-gray-800">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-gray-800/70">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            {(profile?.user.name ?? "N").trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-800 dark:text-gray-100">
              {profile?.user.name ?? "موظف NOVA"}
            </div>
            <div className="truncate text-xs text-slate-500 dark:text-gray-400">
              {profile?.staffRole?.name ?? "بدون دور"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
