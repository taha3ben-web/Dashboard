"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Car,
  Users,
  Route,
  Map,
  Wallet,
  Ticket,
  Bell,
  LifeBuoy,
  Settings,
  Smartphone,
} from "lucide-react";

const LINKS = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/drivers", label: "السائقون", icon: Car },
  { href: "/passengers", label: "الركاب", icon: Users },
  { href: "/trips", label: "الرحلات", icon: Route },
  { href: "/live-map", label: "الخريطة الحية", icon: Map },
  { href: "/earnings", label: "الأرباح", icon: Wallet },
  { href: "/coupons", label: "الكوبونات", icon: Ticket },
  { href: "/notifications", label: "الإشعارات", icon: Bell },
  { href: "/support", label: "الدعم الفني", icon: LifeBuoy },
  { href: "/app-versions", label: "إصدارات التطبيق", icon: Smartphone },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-l border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:block">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-bold">
          N
        </div>
        <span className="text-lg font-bold">NOVA Ride</span>
      </div>
      <nav className="space-y-1">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
              )}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
