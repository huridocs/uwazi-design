/** The toolbar control: a paper button with a `border-border` hairline, 2rem
 *  high, `rounded-md`. Every toolbar that steers a view draws its controls
 *  this way: the Library masthead (Views, Display, the view switcher and Language,
 *  which are `Select`s), the Settings list toolbars, `FiltersButton` and the
 *  Relationships toolbar (Display, Connect, Filters). Search fields beside them
 *  take the same paper and border.
 *
 *  It is a paper control, not a warm one, so it keeps its border on any ground:
 *  the Library masthead is parchment and the Relationships toolbar sits in the
 *  warm lane. The rule that buttons on warm take no edge is about `WARM_BUTTON`
 *  and the bar ladder (`warmButton.ts`), whose fill is the warm itself.
 *
 *  Action bars at the foot of a pane are not toolbars; they keep the ladder.
 *
 *  Shape only; the caller adds the box (`TOOL_ICON_BOX` for an icon-only
 *  button, `h-8` and padding for a labelled one) and one of the states below. */
export const TOOL_SHAPE = "relative inline-flex items-center justify-center rounded-md border transition-colors";

/** An icon-only toolbar button's box. The icon is 14px. */
export const TOOL_ICON_BOX = "w-8 h-8";

/** At rest. */
export const TOOL_BUTTON = "bg-paper text-ink-secondary border-border hover:bg-parchment hover:text-ink cursor-pointer";

/** Open, or set away from its default (a modified Display, a current view,
 *  filters on): ink text, an ink border and a small shadow. Hover changes only
 *  the tint, so a hovered button never reads as an open one. */
export const TOOL_BUTTON_ON = "bg-paper text-ink border-ink/40 shadow-sm cursor-pointer";

/** In its slot but with nothing to do for this view: dimmed, no hover. */
export const TOOL_BUTTON_IDLE = "bg-paper text-ink-muted border-border cursor-default";
