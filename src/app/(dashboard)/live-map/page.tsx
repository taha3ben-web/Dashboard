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
    socket.on("driver:moved", (p: MapDriver) => {
      setDrivers((prev) => {
        const rest = prev.filter((d) => d.id !== p.id);
        return [...rest, p];
      });
    });
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
