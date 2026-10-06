import { useEffect, useRef } from "react";
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
  type LibraryCluster,
} from "../../atoms/library";
import { collectionSettings } from "../../atoms/settingsSingletons";
import { MapPinOff } from "lucide-react";
import { entityCountries } from "../../utils/libraryFacets";
import { getEntity, getEntityType, type Entity } from "../../data/entities";
import { useLeafletMap, labelledDivIcon } from "../shared/map/useLeafletMap";

/** Zoom a fit to the pins stops at, so one pin (or pins on one building)
 *  does not open at street level. At 6 the map stayed at country scale for
 *  every filter: Kathmandu District opened on all of northern India. */
const FIT_MAX_ZOOM = 12;
const PIN = 14;

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
 *  Space opens them. */
export function LibraryMapView({ entities }: { entities: Entity[] }) {
  const language = useAtomValue(languageAtom);
  const [selectedCluster, setSelectedCluster] = useAtom(librarySelectedClusterAtom);
  const setSelectedId = useSetAtom(libraryOpenEntityIdAtom);
  // Facets OR the search — this button clears both, and the empty screen it
  // rescues you from is most often a search that matched nothing.
  const hasNarrowing = useAtomValue(libraryHasNarrowingAtom);
  const clearFilters = useSetAtom(clearLibraryFiltersAtom);
  const startingPoint = useAtomValue(collectionSettings.valueAtom).mapStartingPoint;

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
    if (located.length) map.fitBounds(group.getBounds(), { maxZoom: FIT_MAX_ZOOM, padding: [32, 32] });

    return () => {
      groupRef.current = null;
      map.removeLayer(group);
    };
    // `located` follows `entities`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, entities, setSelectedCluster, setSelectedId]);

  // Redraw the badges to mark the selected one, or to rename them in a new language.
  useEffect(() => {
    groupRef.current?.refreshClusters();
    if (keyboardOpen.current) {
      keyboardOpen.current = false;
      host.current?.querySelector<HTMLElement>(".map-cluster[data-active]")?.focus({ preventScroll: true });
    }
  }, [selectedCluster, language]);

  const unlocated = entities.length - located.length;

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
              style={{ border: "1px solid var(--border-primary)", boxShadow: "0 6px 18px rgba(0,0,0,0.08)" }}
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
        <p data-part="caption" className="absolute top-3 start-3 z-[1000] text-meta text-ink-tertiary bg-paper/80 backdrop-blur-sm rounded px-2 py-0.5">
          {located.length.toLocaleString()} located {located.length === 1 ? "entity" : "entities"}
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
