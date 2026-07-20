"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { num } from "@/lib/format";
import type { MapDriver } from "@/components/LiveMap";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

export default function LiveMapPage() {
  const [drivers, setDrivers] = useState<MapDriver[]>([]);

  useEffect(() => {
    api
      .get("/dashboard/live-map")
      .then((r) => setDrivers(r.data.drivers ?? []))
      .catch(() => {});

    const socket = getSocket();
    // ملاحظة: الخادم يبثّ الحقل باسم driverId (وليس id)، لذا نطبّعه هنا
    // ونحافظ على حالة الانشغال/الاتجاه السابقة لأن حدث الموقع لا يحملهما.
    socket.on(
      "driver:moved",
      (p: {
        driverId?: string;
        id?: string;
        lat: number;
        lng: number;
        heading?: number;
        busy?: boolean;
      }) => {
        const id = p.id ?? p.driverId;
        if (!id) return;
        setDrivers((prev) => {
          const existing = prev.find((d) => d.id === id);
          const rest = prev.filter((d) => d.id !== id);
          return [
            ...rest,
            {
              id,
              lat: p.lat,
              lng: p.lng,
              heading: p.heading ?? existing?.heading,
              busy: p.busy ?? existing?.busy,
            },
          ];
        });
      },
    );
    return () => {
      socket.off("driver:moved");
    };
  }, []);

  const available = drivers.filter((d) => !d.busy).length;
  const busy = drivers.filter((d) => d.busy).length;

  return (
    <>
      <Topbar title="الخريطة الحية" />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="rounded-lg bg-green-500/10 px-3 py-1 text-green-500">
            متاح: {num(available)}
          </span>
          <span className="rounded-lg bg-amber-500/10 px-3 py-1 text-amber-500">
            مشغول: {num(busy)}
          </span>
          <span className="rounded-lg bg-brand/10 px-3 py-1 text-brand">
            الإجمالي المتصل: {num(drivers.length)}
          </span>
        </div>
        <LiveMap drivers={drivers} height="70vh" />
      </div>
    </>
  );
}
