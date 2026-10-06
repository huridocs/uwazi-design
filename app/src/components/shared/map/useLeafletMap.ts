import { useEffect, useState, type RefObject } from "react";
import L from "leaflet";
import { useAtomValue } from "jotai";
import "leaflet/dist/leaflet.css";
import "./map.css";
import { collectionSettings, type MapLayer, type MapProvider } from "../../../atoms/settingsSingletons";
import { themeAtom, resolveTheme } from "../../../atoms/theme";

/* Tiles as Uwazi picks them (app/react/Map/TilesProviderFactory.ts): Mapbox or
 * Google by the collection's Map Provider, with its Map API key, offering the
 * Map Layers it lists. Uwazi falls back to a token embedded in its source; that
 * is HURIDOCS production's key, so here a collection without a key gets
 * OpenStreetMap's standard tiles instead, which need no key on any host (CARTO's
 * basemaps now answer every keyless request with an "API key required" tile).
 * `map.css` quiets them toward the paper palette and inverts them in dark mode. */

const MAPBOX_URL = "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}";
/** Uwazi's style ids, in its key order. */
const MAPBOX_STYLES: [MapLayer, string][] = [
  ["Streets", "mapbox/streets-v12"],
  ["Satellite", "mapbox/satellite-v9"],
  ["Hybrid", "mapbox/satellite-streets-v12"],
  ["Dark", "mapbox/dark-v11"],
];
const GOOGLE_STYLES: [MapLayer, string][] = [
  ["Streets", "roadmap"],
  ["Satellite", "satellite"],
  ["Hybrid", "hybrid"],
];
const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';
const MAPBOX_ATTRIBUTION = `&copy; <a href="https://www.mapbox.com/about/maps" target="_blank" rel="noopener noreferrer">Mapbox</a> ${OSM}`;
const MAXAR = '&copy; <a href="https://www.maxar.com/" target="_blank" rel="noopener noreferrer">Maxar</a>';

function osmLayer(): L.TileLayer {
  return L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    className: "map-tiles-osm",
    attribution: `${OSM} contributors`,
  });
}

let googleLoading: Promise<void> | undefined;
/** GoogleMutant draws through Google's Maps JavaScript API, so the API (and the
 *  key) loads first. One load shared by every map; a failed load can retry. */
async function ensureGoogleMaps(apiKey: string) {
  if ((window as unknown as { google?: { maps?: unknown } }).google?.maps) return;
  if (!googleLoading) {
    googleLoading = Promise.all([import("@googlemaps/js-api-loader"), import("leaflet.gridlayer.googlemutant")])
      .then(([{ Loader }]) => new Loader({ apiKey, retries: 1 }).load())
      .then(() => undefined)
      .catch((err: unknown) => {
        googleLoading = undefined;
        throw err;
      });
  }
  return googleLoading;
}

interface BaseLayers {
  /** Label → layer, in the layers control's order. */
  layers: Record<string, L.Layer>;
  initial: string;
}

async function loadBaseLayers(provider: MapProvider, apiKey: string, wanted: MapLayer[], dark: boolean): Promise<BaseLayers> {
  const keyless = (): BaseLayers => ({ layers: { Map: osmLayer() }, initial: "Map" });
  const key = apiKey.trim();
  if (!key) return keyless();
  const pick = (styles: [MapLayer, string][]) => styles.filter(([name]) => !wanted.length || wanted.includes(name));
  // Uwazi opens on the first listed layer; dark mode opens on Dark when it is offered.
  const initialOf = (names: string[]) => (dark && names.includes("Dark") ? "Dark" : names[0]);

  if (provider === "google") {
    try {
      await ensureGoogleMaps(key);
    } catch {
      return keyless();
    }
    const styles = pick(GOOGLE_STYLES);
    if (!styles.length) return keyless();
    const gridLayer = L.gridLayer as unknown as { googleMutant: (o: object) => L.Layer };
    const layers = Object.fromEntries(
      styles.map(([name, type]) => [name, gridLayer.googleMutant({ type, minZoom: 1, maxZoom: 20 })]),
    );
    return { layers, initial: initialOf(Object.keys(layers)) };
  }

  const styles = pick(MAPBOX_STYLES);
  if (!styles.length) return keyless();
  const layers = Object.fromEntries(
    styles.map(([name, id]) => [
      name,
      L.tileLayer(MAPBOX_URL, {
        id,
        accessToken: key,
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 20,
        attribution: name === "Satellite" || name === "Hybrid" ? `${MAPBOX_ATTRIBUTION} ${MAXAR}` : MAPBOX_ATTRIBUTION,
      } as L.TileLayerOptions),
    ]),
  );
  return { layers, initial: initialOf(Object.keys(layers)) };
}

/** A Leaflet map in `host`, with the collection's tiles, an attribution line
 *  and (with `controls`) zoom and layer controls at the bottom right. Returns
 *  the map once it exists, so callers add their own layers in an effect keyed
 *  on it. The host must have a definite size; the map follows it as it resizes. */
export function useLeafletMap(
  host: RefObject<HTMLDivElement | null>,
  options: L.MapOptions & { controls?: boolean },
): L.Map | null {
  const [map, setMap] = useState<L.Map | null>(null);
  const settings = useAtomValue(collectionSettings.valueAtom);
  const dark = resolveTheme(useAtomValue(themeAtom)) === "dark";
  const { controls = true, ...mapOptions } = options;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const m = L.map(el, { zoomControl: false, attributionControl: false, worldCopyJump: true, ...mapOptions });
    L.control.attribution({ prefix: false, position: "bottomright" }).addTo(m);
    if (controls) L.control.zoom({ position: "bottomright" }).addTo(m);
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

  const layersKey = settings.mapLayers.join(",");
  useEffect(() => {
    if (!map) return;
    let live = true;
    let added: L.Layer | null = null;
    let control: L.Control.Layers | null = null;
    loadBaseLayers(settings.mapProvider, settings.mapApiKey, settings.mapLayers, dark).then(({ layers, initial }) => {
      if (!live) return;
      added = layers[initial];
      added.addTo(map);
      if (controls && Object.keys(layers).length > 1) {
        control = L.control.layers(layers, {}, { position: "bottomright" }).addTo(map);
        map.on("baselayerchange", (e: L.LayersControlEvent) => (added = e.layer));
      }
    });
    return () => {
      live = false;
      map.off("baselayerchange");
      if (added) map.removeLayer(added);
      control?.remove();
    };
    // `layersKey` stands for `settings.mapLayers`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, settings.mapProvider, settings.mapApiKey, layersKey, dark, controls]);

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
