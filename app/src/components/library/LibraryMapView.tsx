import { useCallback, useMemo, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ComposableMap, Geographies, Geography, Graticule, Marker, ZoomableGroup } from "react-simple-maps";
import worldData from "world-atlas/countries-110m.json";
import { languageAtom } from "../../atoms/language";
import { librarySelectedClusterAtom, librarySelectedEntityIdAtom } from "../../atoms/library";
import { entityCountries } from "../../utils/libraryFacets";
import { getEntity, type Entity } from "../../data/entities";

const WIDTH = 800;
const HEIGHT = 400;
const SCALE = 127;
const START_ZOOM = 1.6;

/** How close two pins may sit, in ON-SCREEN units, before they merge. Compared
 *  against projected distance ÷ zoom, so clusters break apart as you zoom in. */
const CLUSTER_PX = 16;

/* The map is a plain equirectangular projection with no rotation, so projecting
 * and inverting is two lines of arithmetic — no need to pull d3-geo in as a
 * direct dependency just to reach the same numbers react-simple-maps uses. */
const project = (lng: number, lat: number): [number, number] => [
  WIDTH / 2 + SCALE * (lng * (Math.PI / 180)),
  HEIGHT / 2 - SCALE * (lat * (Math.PI / 180)),
];
const invert = (x: number, y: number): [number, number] => [
  ((x - WIDTH / 2) / SCALE) * (180 / Math.PI),
  ((HEIGHT / 2 - y) / SCALE) * (180 / Math.PI),
];

interface Cluster {
  key: string;
  label: string;
  lng: number;
  lat: number;
  count: number;
  ids: string[];
}

/** Library geolocation view. Real world geography via react-simple-maps
 *  (equirectangular + graticule), styled to our tokens.
 *
 *  Pins cluster by SCREEN PROXIMITY at the current zoom, not by identical
 *  coordinates. They used to key on `${lat},${lng}` — fine when every entity sat
 *  on a shared country centroid, but once the adapter started reading real
 *  geolocation properties no two incidents shared a coordinate, so 352 pins each
 *  reading "1" piled on top of each other into an unreadable mass. Zooming in
 *  splits a cluster; zooming out merges it. */
export function LibraryMapView({ entities }: { entities: Entity[] }) {
  const language = useAtomValue(languageAtom);
  const [selectedCluster, setSelectedCluster] = useAtom(librarySelectedClusterAtom);
  const setSelectedId = useSetAtom(librarySelectedEntityIdAtom);
  const [zoom, setZoom] = useState(START_ZOOM);

  // MUST be stable. react-simple-maps' useZoomPan lists onMove/onMoveEnd in the
  // deps of the effect that attaches d3-zoom, so an inline arrow — a new function
  // every render — makes it tear down and re-attach the zoom behaviour on each
  // render. Re-attaching mid-gesture kills d3's "end" event, so onMoveEnd never
  // fired, the zoom level never reached this component, and the clusters never
  // re-computed. The map's own `center`/`zoom` props stay CONSTANT (uncontrolled)
  // — useZoomPan's re-sync effect keys off those props, so leaving them fixed is
  // what stops it yanking the map back to the initial view on every re-render.
  const handleMoveEnd = useCallback(({ zoom: z }: { zoom: number }) => setZoom(z), []);

  const clusters = useMemo(() => {
    const pts = entities
      .filter((e) => e.geo)
      .map((e) => {
        const [x, y] = project(e.geo!.lng, e.geo!.lat);
        return { e, x, y };
      });

    // Greedy proximity merge against a running centroid. n is in the hundreds,
    // so the O(n·clusters) scan is far cheaper than pulling in a quadtree.
    const threshold = CLUSTER_PX / zoom;
    const t2 = threshold * threshold;
    const acc: { x: number; y: number; sx: number; sy: number; ids: string[]; labels: string[] }[] = [];

    for (const p of pts) {
      const hit = acc.find((c) => (c.x - p.x) ** 2 + (c.y - p.y) ** 2 <= t2);
      const label = entityCountries(p.e, language)[0] ?? "";
      if (hit) {
        hit.ids.push(p.e.id);
        hit.labels.push(label);
        hit.sx += p.x;
        hit.sy += p.y;
        hit.x = hit.sx / hit.ids.length;
        hit.y = hit.sy / hit.ids.length;
      } else {
        acc.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, ids: [p.e.id], labels: [label] });
      }
    }

    return acc.map((c): Cluster => {
      const [lng, lat] = invert(c.x, c.y);
      // A lone pin is one incident — name it after the entity. A cluster is a
      // place; name it after the country its members share, if they share one.
      const countries = [...new Set(c.labels.filter(Boolean))];
      const label =
        c.ids.length === 1
          ? getEntity(c.ids[0])?.title ?? countries[0] ?? "Location"
          : countries.length === 1
            ? countries[0]
            : `${c.ids.length} locations`;
      return { key: c.ids[0], label, lng, lat, count: c.ids.length, ids: c.ids };
    });
  }, [entities, language, zoom]);

  const located = clusters.reduce((n, c) => n + c.count, 0);
  const unlocated = entities.length - located;

  const open = (c: Cluster) => {
    if (c.count === 1) {
      setSelectedCluster(null);
      setSelectedId(c.ids[0]);
      return;
    }
    setSelectedId(null);
    setSelectedCluster({ label: c.label, ids: c.ids });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div
        className="relative w-full bg-vellum rounded-lg border border-border/60 overflow-hidden"
        style={{ aspectRatio: "2 / 1", maxHeight: "100%" }}
      >
        <ComposableMap
          projection="geoEquirectangular"
          width={WIDTH}
          height={HEIGHT}
          projectionConfig={{ scale: SCALE, center: [0, 0] }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup
            center={[-60, -12]}
            zoom={START_ZOOM}
            minZoom={1}
            maxZoom={24}
            onMoveEnd={handleMoveEnd}
          >
            <Geographies geography={worldData as object}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="var(--bg-surface)"
                    stroke="var(--border-primary)"
                    strokeWidth={0.4 / zoom}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "var(--bg-surface)" },
                      pressed: { outline: "none", fill: "var(--bg-surface)" },
                    }}
                  />
                ))
              }
            </Geographies>

            <Graticule stroke="var(--border-soft)" strokeWidth={0.35 / zoom} step={[30, 30]} />

            {clusters.map((c) => {
              // ZoomableGroup scales its children, so every pin dimension is
              // divided by the zoom to keep a constant on-screen size. Without
              // this the markers balloon as you zoom and re-swamp the map.
              const base = c.count === 1 ? 3.5 : 4.5 + Math.min(Math.sqrt(c.count) * 1.6, 7);
              const r = base / zoom;
              const active = selectedCluster?.ids.length === c.ids.length && selectedCluster?.label === c.label;
              return (
                <Marker key={c.key} coordinates={[c.lng, c.lat]} onClick={() => open(c)}>
                  <circle
                    r={r}
                    strokeWidth={1 / zoom}
                    style={{ cursor: "pointer" }}
                    fill={
                      active
                        ? "var(--text-primary)"
                        : "color-mix(in srgb, var(--accent-blue) 22%, transparent)"
                    }
                    stroke={
                      active
                        ? "var(--text-primary)"
                        : "color-mix(in srgb, var(--accent-blue) 70%, transparent)"
                    }
                  />
                  {/* A count on a single pin is noise — it's always "1". */}
                  {c.count > 1 && (
                    <text
                      textAnchor="middle"
                      dy="0.32em"
                      style={{
                        fontSize: 7 / zoom,
                        fontWeight: 600,
                        pointerEvents: "none",
                        fill: active ? "#fff" : "var(--text-primary)",
                      }}
                    >
                      {c.count}
                    </text>
                  )}
                  <title>{`${c.label}${c.count > 1 ? ` · ${c.count}` : ""}`}</title>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Caption — states what ISN'T here. Only entities with a real
            geolocation property are plotted, and in a corpus like CEJIL that is
            a small minority; without this the map reads as the whole library. */}
        <div className="absolute bottom-2 left-2 text-[11px] text-ink-tertiary bg-paper/70 backdrop-blur-sm rounded px-2 py-0.5">
          {located.toLocaleString()} located {located === 1 ? "entity" : "entities"} ·{" "}
          {clusters.length.toLocaleString()} {clusters.length === 1 ? "pin" : "pins"}
          {unlocated > 0 && (
            <span className="text-ink-muted">
              {" · "}
              {unlocated.toLocaleString()} with no geolocation
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
