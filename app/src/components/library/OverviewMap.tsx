import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { getEntityType, type Entity } from "../../data/entities";
import type { MapBounds } from "../../utils/libraryFilter";
import { useLeafletMap, labelledDivIcon } from "../shared/map/useLeafletMap";

const PIN = 12;

const isActivation = (e: L.LeafletEvent) => {
  const key = (e as L.LeafletKeyboardEvent).originalEvent?.key;
  return key === "Enter" || key === " ";
};

const boundsOf = (b: L.LatLngBounds): MapBounds => {
  const r = (n: number) => Math.round(n * 1e4) / 1e4;
  return { south: r(b.getSouth()), west: r(b.getWest()), north: r(b.getNorth()), east: r(b.getEast()) };
};

/** The Overview's map: every located record, clustered as the Map view
 *  clusters them, fitted once and still (no pan or zoom of its own). A cluster
 *  opens the Map view on its area, a pin opens its record, and the ground
 *  opens the Map view on the whole collection. Pins and clusters are buttons
 *  (Tab, Enter); the section's "Open Map" is the way to the whole map. Lazy, like the Map view, so
 *  Leaflet loads only where a map is drawn. */
export default function OverviewMap({
  located,
  onArea,
  onRecord,
  onMap,
}: {
  located: Entity[];
  onArea: (bounds: MapBounds) => void;
  onRecord: (id: string) => void;
  onMap: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useLeafletMap(host, {
    center: [0, 0],
    zoom: 2,
    minZoom: 1,
    maxZoom: 18,
    controls: false,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    touchZoom: false,
    keyboard: false,
  });
  // The handlers change identity with every render of the Overview; the pins
  // read them through a ref instead of being rebuilt.
  const handlers = useRef({ onArea, onRecord, onMap });
  handlers.current = { onArea, onRecord, onMap };

  useEffect(() => {
    if (!map) return;
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: false,
      zoomToBoundsOnClick: false,
      maxClusterRadius: 48,
      iconCreateFunction: (cluster) => {
        const n = cluster.getChildCount();
        const size = n < 10 ? 28 : n < 100 ? 32 : 38;
        return labelledDivIcon(
          { html: `<span>${n.toLocaleString()}</span>`, className: "map-cluster", iconSize: [size, size] },
          `Open the map on these ${n.toLocaleString()} records`,
        );
      },
    });
    group.on("clusterclick clusterkeypress", (e) => {
      if (e.type === "clusterkeypress" && !isActivation(e)) return;
      const cluster = (e as unknown as { layer: L.MarkerCluster }).layer;
      // A hair of padding, so the records at the cluster's edge stay inside
      // the area after rounding; any more takes in neighbours the badge did
      // not count.
      handlers.current.onArea(boundsOf(cluster.getBounds().pad(0.002)));
    });
    for (const e of located) {
      const color = getEntityType(e.typeId)?.color ?? "var(--text-tertiary)";
      const pin = L.marker([e.geo!.lat, e.geo!.lng], {
        title: e.title,
        icon: labelledDivIcon(
          { html: `<span class="map-pin" style="--pin-color:${color}"></span>`, className: "", iconSize: [PIN, PIN] },
          `Open ${e.title}`,
        ),
      });
      pin.on("click", () => handlers.current.onRecord(e.id));
      pin.on("keypress", (ev) => isActivation(ev) && handlers.current.onRecord(e.id));
      group.addLayer(pin);
    }
    group.addTo(map);
    if (located.length) map.fitBounds(group.getBounds(), { maxZoom: 8, padding: [20, 20], animate: false });
    // The ground: anything that is not a pin or a cluster.
    const onGround = () => handlers.current.onMap();
    map.on("click", onGround);
    return () => {
      map.off("click", onGround);
      map.removeLayer(group);
    };
  }, [map, located]);

  return (
    <div
      ref={host}
      data-component="OverviewMap"
      className="absolute inset-0 cursor-pointer"
    />
  );
}
