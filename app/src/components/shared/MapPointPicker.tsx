import { lazy, Suspense } from "react";
import type { MapPointPickerProps } from "./map/PointPickerMap";

// Lazy: Leaflet loads with the first map on screen, not with Settings.
const PointPickerMap = lazy(() => import("./map/PointPickerMap").then((m) => ({ default: m.PointPickerMap })));

const FRAME = "w-full aspect-[2/1] rounded-lg overflow-hidden bg-vellum border border-border";

/** A map that places one point where it is clicked or tapped. The coordinates
 *  are also typed in the inputs that sit with it, which are the keyboard path.
 *  The frame has its size before the map loads, so loading shifts nothing. */
export function MapPointPicker(props: MapPointPickerProps) {
  return (
    <Suspense fallback={<div data-component="MapPointPicker" className={FRAME} />}>
      <PointPickerMap {...props} frameClassName={FRAME} />
    </Suspense>
  );
}
