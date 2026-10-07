import { startTransition, useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { languageAtom } from "../../atoms/language";
import {
  librarySelectedClusterAtom,
  libraryOpenEntityIdAtom,
  libraryHasNarrowingAtom,
  clearLibraryFiltersAtom,
  libraryMapBoundsAtom,
  type LibraryCluster,
  type MapBounds,
} from "../../atoms/library";
import { collectionSettings } from "../../atoms/settingsSingletons";
import { MapPinOff } from "lucide-react";
import { entityCountries } from "../../utils/libraryFacets";
import { entityInMapBounds } from "../../utils/libraryFilter";
import { getEntity, getEntityType, type Entity } from "../../data/entities";
import { useLeafletMap, labelledDivIcon } from "../shared/map/useLeafletMap";
import { CANVAS_OVERLAY } from "../shared/canvasOverlay";

/** Zoom a fit to the pins stops at, so one pin (or pins on one building)
 *  does not open at street level. At 6 the map stayed at country scale for
 *  every filter: Kathmandu District opened on all of northern India. */
const FIT_MAX_ZOOM = 12;
const PIN = 14;
/** The map area is written this long after the map stops, not on every frame. */
const BOUNDS_SETTLE_MS = 150;
/** A move that starts this long after the reader's last wheel, click, key or
 *  pinch is theirs (the wheel waits 40 ms before it zooms). */
const GESTURE_WINDOW_MS = 1000;

/** The area as stored: rounded, so a link stays short. */
const boundsOf = (b: L.LatLngBounds): MapBounds => {
  const r = (n: number) => Math.round(n * 1e4) / 1e4;
  return { south: r(b.getSouth()), west: r(b.getWest()), north: r(b.getNorth()), east: r(b.getEast()) };
};
const latLngBoundsOf = (b: MapBounds) => L.latLngBounds([b.south, b.west], [b.north, b.east]);

interface PinOptions extends L.MarkerOptions {
  entityId: string;
}

const isActivation = (e: L.LeafletEvent) => {
  const key = (e as L.LeafletKeyboardEvent).originalEvent?.key;
  return key === "Enter" || key === " ";
};

/** Library geolocation view, on Leaflet and leaflet.markercluster as Uwazi
 *  draws it (app/react/Map/LMap.tsx), with the collection's tiles.
 *
 *  One pin per entity with a geolocation, in its template's colour. Nearby pins
 *  merge into markercluster's fixed-size badges; a badge zooms to its members,
 *  and one whose members cannot split any further (they share a point, or the
 *  map is at its last zoom) opens them as a list in the drawer. A pin opens the
 *  entity's preview. Pins and badges are buttons: Tab reaches them, Enter or
 *  Space opens them.
 *
 *  `entities` is the result set without the map's area. When the reader pans
 *  or zooms, the visible area becomes a filter (`libraryMapBoundsAtom`); the
 *  map's own fits never write it, so opening the view narrows nothing. While
 *  an area is set the map keeps the reader's view instead of refitting. */
export function LibraryMapView({ entities }: { entities: Entity[] }) {
  const language = useAtomValue(languageAtom);
  const [selectedCluster, setSelectedCluster] = useAtom(librarySelectedClusterAtom);
  const setSelectedId = useSetAtom(libraryOpenEntityIdAtom);
  // Facets OR the search — this button clears both, and the empty screen it
  // rescues you from is most often a search that matched nothing.
  const hasNarrowing = useAtomValue(libraryHasNarrowingAtom);
  const clearFilters = useSetAtom(clearLibraryFiltersAtom);
  const startingPoint = useAtomValue(collectionSettings.valueAtom).mapStartingPoint;
  const [mapBounds, setMapBounds] = useAtom(libraryMapBoundsAtom);
  const mapBoundsRef = useRef(mapBounds);
  mapBoundsRef.current = mapBounds;
  // The area this map last wrote; any other value (a saved view) moves the map.
  const written = useRef<MapBounds | null>(null);
  const gestureAt = useRef(-Infinity);

  const host = useRef<HTMLDivElement>(null);
  const map = useLeafletMap(host, {
    center: startingPoint ? [startingPoint.lat, startingPoint.lon] : [-12, -60],
    zoom: 3,
    minZoom: 1,
    maxZoom: 18,
  });

  // The cluster icons read these when markercluster redraws them; refs, so a
  // new selection or language refreshes the badges without rebuilding pins.
  const languageRef = useRef(language);
  languageRef.current = language;
  const selectedRef = useRef<LibraryCluster | null>(selectedCluster);
  selectedRef.current = selectedCluster;
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  // A badge opened from the keyboard is redrawn (zoom, or the selection mark),
  // which drops focus to the page; this says to put it back.
  const keyboardOpen = useRef(false);

  const located = entities.filter((e) => e.geo);

  useEffect(() => {
    if (!map) return;
    /** A badge is named after the country its members share, and when they
     *  straddle a border, after the main one, so badges of the same size do
     *  not all read alike. */
    const clusterInfo = (cluster: L.MarkerCluster): LibraryCluster => {
      const ids = cluster.getAllChildMarkers().map((m) => (m.options as PinOptions).entityId);
      const countries = [
        ...new Set(
          ids.map((id) => {
            const e = getEntity(id);
            return e ? entityCountries(e, languageRef.current)[0] ?? "" : "";
          }).filter(Boolean),
        ),
      ];
      const label =
        countries.length === 0
          ? `${ids.length} locations`
          : countries.length === 1
            ? countries[0]
            : `${countries[0]} +${countries.length - 1}`;
      return { label, ids };
    };

    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: false,
      zoomToBoundsOnClick: false,
      iconCreateFunction: (cluster) => {
        const { label, ids } = clusterInfo(cluster);
        const n = ids.length;
        const size = n < 10 ? 32 : n < 100 ? 38 : 44;
        const sel = selectedRef.current;
        const active = !!sel && sel.ids.length === n && sel.ids[0] === ids[0];
        return labelledDivIcon(
          {
            html: `<span>${n.toLocaleString()}</span>`,
            className: "map-cluster",
            iconSize: [size, size],
          },
          `${label} · ${n} entities`,
          active ? { "data-active": "" } : {},
        );
      },
    });

    const openCluster = (e: L.LeafletEvent) => {
      if (e.type === "clusterkeypress" && !isActivation(e)) return;
      (e as L.LeafletKeyboardEvent).originalEvent?.preventDefault?.();
      const cluster = (e as unknown as { layer: L.MarkerCluster }).layer;
      const bounds = cluster.getBounds();
      const onePoint = bounds.getNorthEast().equals(bounds.getSouthWest());
      const fromKeyboard = e.type === "clusterkeypress";
      if (onePoint || map.getZoom() >= map.getMaxZoom()) {
        keyboardOpen.current = fromKeyboard;
        setSelectedId(null);
        setSelectedCluster(clusterInfo(cluster));
      } else {
        // After a zoom the badge is gone; the map itself takes focus, and Tab
        // goes on to the pins and badges now in view.
        if (fromKeyboard) map.once("zoomend", () => map.getContainer().focus({ preventScroll: true }));
        gestureAt.current = performance.now();
        cluster.zoomToBounds({ padding: [24, 24] });
      }
    };
    group.on("clusterclick clusterkeypress", openCluster);

    for (const e of located) {
      const color = getEntityType(e.typeId)?.color ?? "var(--text-tertiary)";
      const pin = L.marker([e.geo!.lat, e.geo!.lng], {
        entityId: e.id,
        keyboard: true,
        title: e.title,
        icon: labelledDivIcon(
          {
            html: `<span class="map-pin" style="--pin-color:${color}"></span>`,
            className: "",
            iconSize: [PIN, PIN],
          },
          `Open ${e.title}`,
        ),
      } as PinOptions);
      const open = () => {
        setSelectedCluster(null);
        setSelectedId(e.id);
      };
      pin.on("click", open);
      pin.on("keypress", (ev) => {
        if (!isActivation(ev)) return;
        (ev as L.LeafletKeyboardEvent).originalEvent.preventDefault();
        open();
      });
      group.addLayer(pin);
    }

    group.addTo(map);
    groupRef.current = group;
    // With an area set, the reader's view stays; the first time with one (a
    // saved view), the map opens on it.
    const area = mapBoundsRef.current;
    if (area) {
      if (written.current !== area) fitArea(area);
    } else if (located.length) {
      gestureAt.current = -Infinity;
      map.fitBounds(group.getBounds(), { maxZoom: FIT_MAX_ZOOM, padding: [32, 32], animate: false });
    }

    return () => {
      groupRef.current = null;
      map.removeLayer(group);
    };
    // `located` follows `entities`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, entities, setSelectedCluster, setSelectedId]);

  /** Show a stored area, as the map's own move. */
  function fitArea(area: MapBounds) {
    if (!map) return;
    gestureAt.current = -Infinity;
    written.current = area;
    map.fitBounds(latLngBoundsOf(area), { animate: false });
  }

  // A saved view or link opened while the map is in front moves it to its area.
  useEffect(() => {
    if (map && mapBounds && written.current !== mapBounds) fitArea(mapBounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fitArea` reads only refs and `map`
  }, [map, mapBounds]);

  // The reader's pans and zooms write the visible area, once the map settles.
  // Only moves that follow a gesture count: the map's fits, a resize of its
  // pane and a pin's click do not.
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    const mark = () => (gestureAt.current = performance.now());
    const onKey = (e: KeyboardEvent) => {
      if (e.key.startsWith("Arrow") || ["+", "-", "=", "_"].includes(e.key)) mark();
    };
    const onTouch = (e: TouchEvent) => e.touches.length > 1 && mark();
    let timer = 0;
    // Decided when the move starts, which Leaflet does in step with the
    // gesture; its end can come seconds later on a busy main thread, and a
    // drag's inertia runs as long as it runs.
    let userMove = false;
    const onMoveStart = () => (userMove = performance.now() - gestureAt.current < GESTURE_WINDOW_MS);
    const onDragStart = () => (userMove = true);
    const onMoveEnd = () => {
      if (!userMove) return;
      userMove = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const next = boundsOf(map.getBounds());
        written.current = next;
        startTransition(() => setMapBounds(next));
      }, BOUNDS_SETTLE_MS);
    };
    // The zoom buttons, a double-click zoom and a shift-drag box zoom.
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest(".leaflet-control-zoom")) mark();
    };
    const onDown = (e: MouseEvent) => e.shiftKey && mark();
    // In the capture phase, before Leaflet's own handlers: a zoom it does not
    // animate ends inside them.
    const opts = { capture: true, passive: true };
    container.addEventListener("wheel", mark, opts);
    container.addEventListener("keydown", onKey, true);
    container.addEventListener("touchstart", onTouch, opts);
    container.addEventListener("click", onClick, true);
    container.addEventListener("dblclick", mark, true);
    container.addEventListener("mousedown", onDown, true);
    map.on("movestart", onMoveStart);
    map.on("dragstart", onDragStart);
    map.on("moveend", onMoveEnd);
    return () => {
      window.clearTimeout(timer);
      container.removeEventListener("wheel", mark, true);
      container.removeEventListener("keydown", onKey, true);
      container.removeEventListener("touchstart", onTouch, true);
      container.removeEventListener("click", onClick, true);
      container.removeEventListener("dblclick", mark, true);
      container.removeEventListener("mousedown", onDown, true);
      map.off("movestart", onMoveStart);
      map.off("dragstart", onDragStart);
      map.off("moveend", onMoveEnd);
    };
  }, [map, setMapBounds]);

  // Redraw the badges to mark the selected one, or to rename them in a new language.
  useEffect(() => {
    groupRef.current?.refreshClusters();
    if (keyboardOpen.current) {
      keyboardOpen.current = false;
      host.current?.querySelector<HTMLElement>(".map-cluster[data-active]")?.focus({ preventScroll: true });
    }
  }, [selectedCluster, language]);

  const unlocated = entities.length - located.length;
  const inArea = mapBounds ? located.filter((e) => entityInMapBounds(e, mapBounds)).length : null;

  return (
    <div data-component="LibraryMapView" className="relative w-full h-full">
      <div
        data-part="map"
        className="absolute inset-0 isolate bg-vellum overflow-hidden"
      >
        <div ref={host} role="region" aria-label="Map of located entities" className="absolute inset-0" />

        {/* Empty state — a map with no pins is indistinguishable from a map that
            failed to load. Say which, over the map rather than instead of it, so
            the geography stays as context and the way out is right there. */}
        {located.length === 0 && (
          <div data-part="empty" className="absolute inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
            <div
              role="status"
              className="pointer-events-auto max-w-[20rem] text-center bg-paper/90 backdrop-blur-sm rounded-lg px-4 py-3"
            >
              <MapPinOff size={18} aria-hidden className="mx-auto text-ink-muted" />
              <p className="mt-2 text-xs font-semibold text-ink">
                {entities.length ? "Nothing to place on the map" : "No results"}
              </p>
              <p className="mt-1 text-meta text-ink-tertiary leading-snug">
                {entities.length
                  ? `None of these ${entities.length.toLocaleString()} results carry a geolocation. Only entities with coordinates of their own are plotted.`
                  : "No entities match your filters."}
              </p>
              {hasNarrowing && (
                <button
                  type="button"
                  data-part="clear-filters"
                  onClick={() => clearFilters()}
                  className="mt-2.5 px-2.5 h-6 text-meta font-medium rounded-md bg-warm text-ink-secondary hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Caption — states what ISN'T here. Only entities with a real
            geolocation property are plotted, and in a corpus like CEJIL that is
            a small minority; without this the map reads as the whole library. */}
        <p data-part="caption" className={`absolute top-3 start-3 z-[1000] max-w-[calc(100%-1.5rem-var(--rail-reserve,0px))] truncate leading-8 px-2.5 ${CANVAS_OVERLAY} text-meta text-ink-tertiary`}>
          {inArea !== null && <>{inArea.toLocaleString()} of </>}
          {located.length.toLocaleString()} located {located.length === 1 ? "entity" : "entities"}
          {inArea !== null && " in map area"}
          {unlocated > 0 && (
            <span className="text-ink-tertiary">
              {" · "}
              {unlocated.toLocaleString()} with no geolocation
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
