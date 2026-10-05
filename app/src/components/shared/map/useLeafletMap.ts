import { useEffect, useState, type RefObject } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map.css";

/* Tiles: OpenStreetMap's standard layer, which needs no key on any host. Uwazi
 * picks Mapbox or Google by the collection's Map Provider and key; main has no
 * Collection settings, so it draws the keyless layer only (CARTO's basemaps
 * now answer every keyless request with an "API key required" tile).
 * `map.css` quiets the tiles toward the paper palette and inverts them in dark
 * mode. */

const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

function osmLayer(): L.TileLayer {
  return L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    className: "map-tiles-osm",
    attribution: `${OSM} contributors`,
  });
}

/** A Leaflet map in `host`, with OpenStreetMap tiles, an attribution line and
 *  (with `controls`) zoom controls at the bottom right. Returns the map once it
 *  exists, so callers add their own layers in an effect keyed on it. The host
 *  must have a definite size; the map follows it as it resizes. */
export function useLeafletMap(
  host: RefObject<HTMLDivElement | null>,
  options: L.MapOptions & { controls?: boolean },
): L.Map | null {
  const [map, setMap] = useState<L.Map | null>(null);
  const { controls = true, ...mapOptions } = options;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const m = L.map(el, { zoomControl: false, attributionControl: false, worldCopyJump: true, ...mapOptions });
    L.control.attribution({ prefix: false, position: "bottomright" }).addTo(m);
    if (controls) L.control.zoom({ position: "bottomright" }).addTo(m);
    osmLayer().addTo(m);
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el);
    setMap(m);
    return () => {
      ro.disconnect();
      m.remove();
      setMap(null);
    };
    // Options are read once, as Leaflet reads them; later changes go through `map`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);

  return map;
}

/** A div icon whose element carries an accessible name. Leaflet makes a
 *  keyboard-enabled marker's icon a focusable `role="button"` but names it only
 *  through `title`, which a screen reader may skip. */
export function labelledDivIcon(
  options: L.DivIconOptions,
  ariaLabel: string,
  attrs: Record<string, string> = {},
): L.DivIcon {
  const icon = L.divIcon(options);
  const create = icon.createIcon.bind(icon);
  icon.createIcon = (old) => {
    const el = create(old);
    el.setAttribute("aria-label", ariaLabel);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };
  return icon;
}
