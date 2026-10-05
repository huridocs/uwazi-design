import { useRef, type MouseEvent } from "react";
import { ComposableMap, Geographies, Geography, Graticule, Marker } from "react-simple-maps";
import worldData from "world-atlas/countries-110m.json";

const WIDTH = 800;
const HEIGHT = 400;
const SCALE = 127;

/** Equirectangular with no rotation, as the Library map draws it. */
const invert = (x: number, y: number): [number, number] => [
  ((x - WIDTH / 2) / SCALE) * (180 / Math.PI),
  ((HEIGHT / 2 - y) / SCALE) * (180 / Math.PI),
];

const round = (n: number) => Math.round(n * 1e4) / 1e4;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A world map that places one point where it is clicked or tapped. The
 *  coordinates are also typed in the inputs that sit with it, which are the
 *  keyboard path; the map itself is not focusable. */
export function MapPointPicker({
  point,
  onPick,
  label = "Map",
}: {
  /** Where the marker sits, or null for no marker. */
  point: { lat: number; lon: number } | null;
  onPick: (point: { lat: number; lon: number }) => void;
  /** Names the map image for screen readers. */
  label?: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  const click = (e: MouseEvent<HTMLDivElement>) => {
    const svg = host.current?.querySelector("svg");
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const [lon, lat] = invert(p.x, p.y);
    onPick({ lat: round(clamp(lat, -90, 90)), lon: round(clamp(lon, -180, 180)) });
  };

  return (
    <div
      ref={host}
      data-component="MapPointPicker"
      role="img"
      aria-label={point ? `${label}, point at latitude ${point.lat}, longitude ${point.lon}` : `${label}, no point set`}
      onClick={click}
      className="w-full aspect-[2/1] rounded-lg overflow-hidden bg-vellum border border-border cursor-crosshair touch-manipulation"
    >
      <ComposableMap
        projection="geoEquirectangular"
        width={WIDTH}
        height={HEIGHT}
        projectionConfig={{ scale: SCALE, center: [0, 0] }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={worldData as object}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="var(--bg-surface)"
                stroke="var(--border-primary)"
                strokeWidth={0.5}
                style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
              />
            ))
          }
        </Geographies>
        <Graticule stroke="var(--border-soft)" strokeWidth={0.35} step={[30, 30]} />
        {point && (
          <Marker coordinates={[point.lon, point.lat]}>
            <circle r={6} fill="var(--text-primary)" stroke="var(--bg-surface)" strokeWidth={2} />
          </Marker>
        )}
      </ComposableMap>
    </div>
  );
}
