"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useMemo, CSSProperties } from "react";

export interface MapDriver {
  id: string;
  lat: number;
  lng: number;
  heading?: number;
  busy?: boolean;
}

// رابط بلاطات OpenStreetMap المجانية
const OSM_TILE_URL = "https://" + "{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// أيقونة سائق ملوّنة حسب الحالة (أخضر=متاح، برتقالي=مشغول)
function carIcon(busy: boolean): L.DivIcon {
  const color = busy ? "#f59e0b" : "#22c55e";
  const html =
    '<div style="background:' +
    color +
    ';width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,.4)"></div>';
  return L.divIcon({
    className: "",
    html,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

interface Props {
  drivers: MapDriver[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export default function LiveMap(props: Props) {
  const drivers = props.drivers;
  const center = props.center ?? [36.7538, 3.0588];
  const zoom = props.zoom ?? 12;
  const height = props.height ?? "420px";

  const wrapperStyle: CSSProperties = { height };

  const markers = useMemo(
    () =>
      drivers.map((d) => (
        <Marker
          key={d.id}
          position={[d.lat, d.lng]}
          icon={carIcon(Boolean(d.busy))}
        >
          <Popup>
            السائق: {d.id.slice(0, 8)}
            <br />
            الحالة: {d.busy ? "مشغول" : "متاح"}
          </Popup>
        </Marker>
      )),
    [drivers],
  );

  return (
    <div style={wrapperStyle} className="overflow-hidden rounded-xl">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap" url={OSM_TILE_URL} />
        {markers}
      </MapContainer>
    </div>
  );
}
