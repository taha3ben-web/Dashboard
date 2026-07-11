"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const MapContext = createContext<google.maps.Map | null>(null);

interface GoogleMapProps {
  mapContainerStyle?: CSSProperties;
  center: google.maps.LatLngLiteral;
  zoom: number;
  options?: google.maps.MapOptions;
  onLoad?: (map: google.maps.Map) => void;
  onClick?: (event: google.maps.MapMouseEvent) => void;
  children?: ReactNode;
}

export function GoogleMap({
  mapContainerStyle,
  center,
  zoom,
  options,
  onLoad,
  onClick,
  children,
}: GoogleMapProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!elementRef.current || map) return;
    const next = new google.maps.Map(elementRef.current, {
      ...options,
      center,
      zoom,
    });
    setMap(next);
    onLoad?.(next);
  }, [center, map, onLoad, options, zoom]);

  useEffect(() => {
    if (!map) return;
    map.setCenter(center);
    map.setZoom(zoom);
  }, [center, map, zoom]);

  useEffect(() => {
    if (!map || !onClick) return;
    const listener = map.addListener("click", onClick);
    return () => listener.remove();
  }, [map, onClick]);

  return (
    <MapContext.Provider value={map}>
      <div ref={elementRef} style={mapContainerStyle} />
      {map ? children : null}
    </MapContext.Provider>
  );
}

interface MarkerProps {
  position: google.maps.LatLngLiteral;
  title?: string;
  icon?: string | google.maps.Icon | google.maps.Symbol;
  label?: string | google.maps.MarkerLabel;
}

export function Marker({ position, title, icon, label }: MarkerProps) {
  const map = useContext(MapContext);
  useEffect(() => {
    if (!map) return;
    const marker = new google.maps.Marker({ map, position, title, icon, label });
    return () => marker.setMap(null);
  }, [icon, label, map, position, title]);
  return null;
}

interface PolygonProps {
  path?: google.maps.LatLngLiteral[];
  paths?: google.maps.LatLngLiteral[];
  options?: google.maps.PolygonOptions;
  onLoad?: (polygon: google.maps.Polygon) => void;
  onClick?: () => void;
}

export function Polygon({ path, paths, options, onLoad, onClick }: PolygonProps) {
  const map = useContext(MapContext);
  useEffect(() => {
    if (!map) return;
    const polygon = new google.maps.Polygon({
      ...options,
      map,
      paths: paths ?? path ?? [],
    });
    onLoad?.(polygon);
    const listener = onClick ? polygon.addListener("click", onClick) : null;
    return () => {
      listener?.remove();
      polygon.setMap(null);
    };
  }, [map, onClick, onLoad, options, path, paths]);
  return null;
}

interface AutocompleteProps {
  onLoad?: (autocomplete: google.maps.places.Autocomplete) => void;
  onPlaceChanged?: () => void;
  children: ReactElement;
}

export function Autocomplete({ onLoad, onPlaceChanged, children }: AutocompleteProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const input = hostRef.current?.querySelector("input");
    if (!input || !google.maps.places) return;
    const autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ["formatted_address", "geometry", "name", "place_id"],
    });
    onLoad?.(autocomplete);
    const listener = autocomplete.addListener("place_changed", () => onPlaceChanged?.());
    return () => listener.remove();
  }, [onLoad, onPlaceChanged]);

  const onlyChild = Children.only(children);
  return <div ref={hostRef}>{isValidElement(onlyChild) ? cloneElement(onlyChild) : onlyChild}</div>;
}
