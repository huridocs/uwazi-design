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

/** Action-bar weight, one ladder for every bar at the foot of a pane:
 *
 *  1. Solid ink: the one commit a bar may carry (Save, Open entity, New
 *     Import). Not defined here; those buttons own it.
 *  2. `WARM_BUTTON`: the bar's lead action when it has no ink commit (Create
 *     entity, Edit, Add file). At most one per bar.
 *  3. `BAR_GHOST`: everything else. No fill and no edge at rest; the warm fill
 *     comes on hover. Seven filled, ringed buttons in a row is what made the
 *     selection bar read heavy.
 *  4. `BAR_DANGER`: Delete. Seal text at rest so it reads as danger without a
 *     fill; the seal tint comes on hover.
 *
 *  Groups within a bar are split by `BarDivider`, not by giving each button
 *  its own border. */
export const BAR_GHOST = "text-ink-secondary hover:bg-warm hover:text-ink";

export const BAR_DANGER = "text-seal-label hover:bg-seal-tint/40";
