"use client";

import { CSSProperties, useMemo } from "react";
import { GoogleMap, Marker } from "@/components/map/GoogleMaps";
import {
  DEFAULT_CENTER,
  useGoogleMaps,
  type LatLngLiteral,
} from "@/lib/googleMaps";

export interface MapDriver {
  id: string;
  lat: number;
  lng: number;
  heading?: number;
  busy?: boolean;
}

interface Props {
  drivers: MapDriver[];
  center?: LatLngLiteral;
  zoom?: number;
  height?: string;
}

const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  clickableIcons: false,
};

export default function LiveMap(props: Props) {
  const { isLoaded, loadError } = useGoogleMaps();
  const drivers = props.drivers;
  const center = props.center ?? DEFAULT_CENTER;
  const zoom = props.zoom ?? 12;
  const height = props.height ?? "420px";
  const containerStyle: CSSProperties = { width: "100%", height };

  const markers = useMemo(() => {
    if (!isLoaded) return null;
    return drivers.map((d) => {
      const pos: google.maps.LatLngLiteral = { lat: d.lat, lng: d.lng };
      const icon: google.maps.Symbol = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: d.busy ? "#f59e0b" : "#22c55e",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      };
      const title = `السائق ${(d.id ?? "").slice(0, 8)} — ${
        d.busy ? "مشغول" : "متاح"
      }`;
      return <Marker key={d.id} position={pos} title={title} icon={icon} />;
    });
  }, [drivers, isLoaded]);

  if (loadError) {
    return (
      <div
        style={containerStyle}
        className="flex items-center justify-center rounded-xl bg-red-500/10 text-sm text-red-500"
      >
        تعذّر تحميل خريطة Google — تأكّد من NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div
        style={containerStyle}
        className="flex items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400 dark:bg-gray-800"
      >
        جارٍ تحميل الخريطة...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        options={MAP_OPTIONS}
      >
        {markers}
      </GoogleMap>
    </div>
  );
}
