import { BAR_GHOST } from "./warmButton";

/** Controls and readouts that float over a canvas (the Library's Network and
 *  Map views): no border and no shadow. A translucent paper ground with a blur
 *  keeps the text legible over dense edges, pins and tiles. One height (2rem)
 *  and one radius for every overlay. `map.css` repeats this for Leaflet's zoom
 *  control. */
export const CANVAS_OVERLAY = "h-8 rounded-lg bg-paper/80 backdrop-blur-sm";

/** A group of buttons on that ground: 1.75rem buttons inside a 0.125rem inset. */
export const CANVAS_OVERLAY_GROUP = `${CANVAS_OVERLAY} flex items-center gap-0.5 p-0.5`;

/** A button inside a group, on the bar ladder's ghost rung. The caller sets the text size. */
export const CANVAS_OVERLAY_BUTTON = `h-7 min-w-7 px-1.5 rounded-md cursor-pointer transition-colors ${BAR_GHOST} focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40`;

/** An open panel over the canvas (the Layers list): solid paper, still no
 *  border or shadow. */
export const CANVAS_PANEL = "rounded-lg bg-paper";
