import { useMemo } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ComposableMap, Geographies, Geography, Graticule, Marker, ZoomableGroup } from "react-simple-maps";
import worldData from "world-atlas/countries-110m.json";
import { languageAtom } from "../../atoms/language";
import { librarySelectedClusterAtom, librarySelectedEntityIdAtom } from "../../atoms/library";
import { entityCountries } from "../../utils/libraryFacets";
import { getEntity, type Entity } from "../../data/entities";

interface Cluster {
  key: string;
  label: string;
  lat: number;
  lng: number;
  count: number;
  ids: string[];
}

/** Library geolocation view. Real world geography via react-simple-maps
 *  (equirectangular + graticule), styled to our tokens; pins cluster by country,
 *  sized by count, and clicking one toggles that country filter. */
export function LibraryMapView({ entities }: { entities: Entity[] }) {
  const language = useAtomValue(languageAtom);
  const [selectedCluster, setSelectedCluster] = useAtom(librarySelectedClusterAtom);
  const setSelectedId = useSetAtom(librarySelectedEntityIdAtom);

  const clusters = useMemo(() => {
    const m = new Map<string, Cluster>();
    for (const e of entities) {
      if (!e.geo) continue;
      const key = `${e.geo.lat},${e.geo.lng}`;
      // entityCountries handles all sources: own title for país entities,
      // adapter-supplied country (CEJIL), or the Sample native prop.
      const label = entityCountries(e, language)[0] ?? "";
      const c = m.get(key) ?? { key, label, lat: e.geo.lat, lng: e.geo.lng, count: 0, ids: [] };
      c.count += 1;
      c.ids.push(e.id);
      // A pin now sits on a real coordinate, so most hold exactly one entity —
      // an incident site, not a country. Name it after the entity; keep the
      // country name only when the pin genuinely aggregates several.
      c.label = c.count === 1 ? getEntity(e.id)?.title ?? label : label || c.label;
      m.set(key, c);
    }
    return [...m.values()];
  }, [entities, language]);

  const located = clusters.reduce((n, c) => n + c.count, 0);
  const unlocated = entities.length - located;
  const openCluster = (c: Cluster) => {
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
          width={800}
          height={400}
          projectionConfig={{ scale: 127, center: [0, 0] }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup center={[-60, -12]} zoom={1.6} minZoom={1} maxZoom={10}>
            <Geographies geography={worldData as object}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="var(--bg-surface)"
                    stroke="var(--border-primary)"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "var(--bg-surface)" },
                      pressed: { outline: "none", fill: "var(--bg-surface)" },
                    }}
                  />
                ))
              }
            </Geographies>

            <Graticule stroke="var(--border-soft)" strokeWidth={0.35} step={[30, 30]} />

            {clusters.map((c) => {
              const r = Math.min(11, 5 + c.count * 1.1);
              const active = selectedCluster?.label === c.label;
              return (
                <Marker key={c.key} coordinates={[c.lng, c.lat]} onClick={() => openCluster(c)}>
                  <circle
                    r={r}
                    strokeWidth={1}
                    style={{ cursor: "pointer" }}
                    fill={active ? "var(--text-primary)" : "color-mix(in srgb, var(--accent-blue) 16%, transparent)"}
                    stroke={active ? "var(--text-primary)" : "color-mix(in srgb, var(--accent-blue) 70%, transparent)"}
                  />
                  <text
                    textAnchor="middle"
                    dy="0.32em"
                    style={{
                      fontSize: 8,
                      fontWeight: 600,
                      pointerEvents: "none",
                      fill: active ? "#fff" : "var(--text-primary)",
                    }}
                  >
                    {c.count}
                  </text>
                  <title>{`${c.label} · ${c.count}`}</title>
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
          {clusters.length.toLocaleString()} {clusters.length === 1 ? "place" : "places"}
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
