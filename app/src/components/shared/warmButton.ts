/** The warm action-bar button, for bars and footers on a `bg-paper` ground.
 *
 *  The fill stays `bg-warm` with `text-ink-secondary`, as on every action bar.
 *  On paper that fill measures 1.04:1 in light and 1.08:1 in dark, so without
 *  an edge the button reads as loose text. `WARM_EDGE` draws a `border-soft`
 *  hairline: 1.38:1 against paper in light, 2.26:1 in dark.
 *
 *  The edge is an inset ring, not a border. It is painted inside the box, so
 *  the button keeps the size it had without it whatever padding the caller
 *  uses, and it sits in Tailwind's inset-ring shadow slot, so a caller's
 *  `focus-visible:ring-*` still draws on top of it.
 *
 *  Only for paper grounds. On warm, parchment or vellum the fill already
 *  shows, and those buttons take no edge. */
export const WARM_EDGE = "inset-ring inset-ring-border-soft";

export const WARM_BUTTON = `text-ink-secondary bg-warm hover:bg-parchment hover:text-ink ${WARM_EDGE}`;

/** Action-bar weight, one ladder for every bar at the foot of a pane. No
 *  bar button carries a border, ring or inset ring, at any rung:
 *
 *  1. Solid ink (or the success fill on a Save): the one commit a bar may
 *     carry (Save, Open entity, New Import). Not defined here; those buttons
 *     own it.
 *  2. `BAR_LEAD`: the bar's lead action when it has no commit (Create entity,
 *     Edit, Add file). At most one per bar. No fill at rest: a filled button
 *     at rest reads as a pressed or active state. It leads by weight, ink
 *     text at medium weight, and takes the ghosts' warm hover.
 *  3. `BAR_GHOST`: everything else. No fill at rest; warm on hover.
 *  4. `BAR_DANGER`: Delete. Seal text at rest so it reads as danger without a
 *     fill; the seal tint comes on hover.
 *
 *  Groups within a bar are split by `BarDivider`, not by giving each button
 *  its own border. `WARM_BUTTON` stays for dialog and modal footers. */
export const BAR_LEAD = "text-ink font-medium hover:bg-warm";

export const BAR_GHOST = "text-ink-secondary hover:bg-warm hover:text-ink";

export const BAR_DANGER = "text-seal-label hover:bg-seal-tint/40";
