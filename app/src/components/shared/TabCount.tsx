/** The inventory count beside a tab's label — "Relationships 456", "Files 2".
 *
 *  ONE component, where there were three copies (MainTabs, DrawerTabs,
 *  FileDrawer) that had already drifted: two of them formatted and aligned their
 *  digits and one did not, so the same four-figure count read `3749` on one
 *  strip and `3,749` on another, and shifted as it grew.
 *
 *  IT IS AN INVENTORY COUNT, which is what decides everything here. Per
 *  CLAUDE.md a count is always present and sits in the flow (a dot is live state
 *  and is positioned out of it), so it must stay quieter than the label it sits
 *  beside — it is not a badge demanding attention, and neither carbon nor seal
 *  belongs on it.
 *
 *  NO FILL, and that is the whole design. Three treatments were tried in order:
 *  `bg-warm` with tertiary ink, which was invisible — one step of tint on a
 *  `bg-paper` tab, under the lightest step on the ink ladder, so the number read
 *  as a smudge. Then an ink tint at 8%, which overshot in the other direction:
 *  walls plus a two-digit box around a single figure made a CHIP, and a chip
 *  beside a label reads as a control rather than as a count belonging to it.
 *
 *  A fainter tint would not have fixed that — a faint box is still a box, and at
 *  the strength needed to stop reading as one it would have disappeared against
 *  `bg-vellum` anyway, which is the ground the ink tint existed to survive. So
 *  the presence lives in the INK: one step up the ladder to `text-ink-secondary`
 *  and semibold, which is more present than where this started and has no walls
 *  to be a control with. `ms-0.5` keeps it from reading as the last word of the
 *  label.
 *
 *  DROPPING THE FILL IS ALSO WHAT RESOLVES THE MIN-WIDTH. A box reserved for two
 *  digits is what made `2` look boxed — but only because there was a box. With
 *  no fill the reserved width is invisible, so the geometry stays stable (2 and
 *  11 occupy the same space and the tab beside them never moves) at no visual
 *  cost at all. `1rem` is two tabular figures; three and four grow, and only in
 *  width.
 *
 *  Fixed height throughout, so the strip and the tabs keep the geometry they
 *  have always had. */
export function TabCount({ count }: { count: number }) {
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center ms-0.5 h-[1.125rem] min-w-[1rem]
        text-xs font-semibold leading-none tabular-nums text-ink-secondary"
    >
      {count.toLocaleString()}
    </span>
  );
}
