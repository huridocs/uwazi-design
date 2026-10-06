import { useEffect, useRef } from "react";
import L from "leaflet";
import { useLeafletMap, labelledDivIcon } from "./useLeafletMap";

export interface MapPointPickerProps {
  /** Where the marker sits, or null for no marker. */
  point: { lat: number; lon: number } | null;
  onPick: (point: { lat: number; lon: number }) => void;
  /** Names the map for screen readers. */
  label?: string;
}

const round = (n: number) => Math.round(n * 1e4) / 1e4;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A map that places a point where it is clicked (the geolocation editor),
 *  on OpenStreetMap tiles. */
export function PointPickerMap({
  point,
  onPick,
  label = "Map",
  frameClassName,
}: MapPointPickerProps & { frameClassName: string }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useLeafletMap(host, {
    center: point ? [point.lat, point.lon] : [20, 0],
    zoom: point ? 4 : 1,
    minZoom: 1,
    maxZoom: 18,
  });

  // The latest handler, so the click listener is attached once.
  const pick = useRef(onPick);
  pick.current = onPick;
  useEffect(() => {
    if (!map) return;
    const click = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng.wrap();
      pick.current({ lat: round(clamp(lat, -90, 90)), lon: round(clamp(lng, -180, 180)) });
    };
    map.on("click", click);
    return () => {
      map.off("click", click);
    };
  }, [map]);

  const lat = point?.lat;
  const lon = point?.lon;
  useEffect(() => {
    if (!map || lat === undefined || lon === undefined) return;
    const marker = L.marker([lat, lon], {
      keyboard: false,
      interactive: false,
      icon: labelledDivIcon(
        { html: '<span class="map-pin" style="--pin-color:var(--text-primary)"></span>', className: "", iconSize: [16, 16] },
        `Point at latitude ${lat}, longitude ${lon}`,
        // A picture of the point, not a control: it takes no focus or clicks.
        { role: "img" },
      ),
    }).addTo(map);
    // A point typed in the inputs may sit outside the view; bring it in.
    if (!map.getBounds().contains([lat, lon])) map.panTo([lat, lon]);
    return () => {
      marker.remove();
    };
  }, [map, lat, lon]);

  return (
    <div data-component="MapPointPicker" className={`relative isolate ${frameClassName} touch-manipulation`}>
      {/* The Leaflet container is focusable (arrow keys pan), so it carries the name. */}
      <div
        ref={host}
        role="group"
        aria-label={point ? `${label}, point at latitude ${point.lat}, longitude ${point.lon}` : `${label}, no point set`}
        className="absolute inset-0 map-crosshair"
      />
    </div>
  );
}
