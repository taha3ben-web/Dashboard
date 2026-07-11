"use client";

import { useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { Search } from "lucide-react";
import type { LatLngLiteral } from "@/lib/googleMaps";

interface Props {
  onSelect: (loc: LatLngLiteral, label: string) => void;
  placeholder?: string;
}

/** بحث سريع عن مدينة/عنوان عبر Google Places Autocomplete. */
export function PlacesSearch({ onSelect, placeholder }: Props) {
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);

  return (
    <Autocomplete
      onLoad={(ac) => {
        acRef.current = ac;
      }}
      onPlaceChanged={() => {
        const ac = acRef.current;
        if (!ac) return;
        const place = ac.getPlace();
        const loc = place.geometry?.location;
        if (!loc) return;
        onSelect(
          { lat: loc.lat(), lng: loc.lng() },
          place.formatted_address ?? place.name ?? "",
        );
      }}
    >
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder={placeholder ?? "ابحث عن مدينة أو عنوان..."}
          className="w-72 max-w-full rounded-lg border border-gray-300 bg-white/95 py-2 pr-9 pl-3 text-sm text-gray-900 shadow outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-100"
        />
      </div>
    </Autocomplete>
  );
}
