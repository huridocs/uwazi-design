/** The inventory count beside a tab's label — "Relationships 456", "Files 2".
 *
 *  ONE component, where there were three copies (MainTabs, DrawerTabs,
 *  FileDrawer) that had already drifted: two of them formatted and aligned their
 *  digits and one did not, so the same four-figure count read `3749` on one
 *  strip and `3,749` on another, and shifted as it grew.
 *
 *  IT IS AN INVENTORY COUNT, which is what decides everything here. Per
 *  CLAUDE.md a count is always present and sits in the flow (a dot is live state
 *  and is positioned out of it), so this must stay quieter than the label it
 *  sits beside — it is not a badge demanding attention, and neither carbon nor
 *  seal belongs on it. What it was, though, was invisible: `bg-warm` on a
 *  `bg-paper` tab is one step of tint, and `text-ink-tertiary` is the lightest
 *  step on the ladder, so the number read as a smudge.
 *
 *  So it goes one step up the ladder to `text-ink-secondary`, and its ground is
 *  a TINT OF THE INK rather than a warm neutral. That is the part worth keeping:
 *  a fixed warm fill has to work over `bg-paper` (inactive tab) and `bg-vellum`
 *  (active), in both themes, and there is no warm value that separates from all
 *  four — in dark the warm ground is closest of all to its surroundings. A tint
 *  of the text colour darkens whatever is under it in light and lifts it in
 *  dark, because `--text-primary` flips with the theme, so one value separates
 *  on every ground by construction.
 *
 *  NOTHING SHIFTS AS THE NUMBER GROWS. Fixed height, tabular numerals, and a
 *  min-width sized for TWO digits — 1.5rem, which is `px-1` plus the advance of
 *  two tabular figures — so 2 and 11 occupy exactly the same box and only 456
 *  and 3,749 grow, and only in width. Measured: 24 / 24 / 31.7 / 43.5px wide,
 *  18px tall throughout. The height is 18px — the height the old
 *  `px-1` badge happened to have from its line box — so the strip and every tab
 *  keep the geometry they had. */
export function TabCount({ count }: { count: number }) {
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center h-[1.125rem] min-w-[1.5rem]
        px-1 rounded text-xs font-semibold leading-none tabular-nums text-ink-secondary bg-ink/8"
    >
      {count.toLocaleString()}
    </span>
  );
}
