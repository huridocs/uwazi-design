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
 *  THE GROUND IS A TINT, AND THE WEIGHT IS THE WHOLE QUESTION. Three passes
 *  bracket it, and they read as one instruction rather than as contradictions:
 *  `bg-warm` under tertiary ink was invisible — one step of tint on a `bg-paper`
 *  tab, under the lightest step on the ink ladder. `bg-ink/8` in a two-digit box
 *  was a CHIP: visible walls and a lot of interior air around a single figure,
 *  which reads as a control sitting beside the label rather than as a count
 *  belonging to it. No fill at all was not it either. What is wanted is a ground
 *  you notice only if you look for it.
 *
 *  So `bg-ink/4`, and the SHAPE softened with it: `rounded-full` rather than a
 *  radius, because an oval reads as a count and a rounded rectangle reads as a
 *  button; and the box is snug — `min-w` equal to the HEIGHT, so a single digit
 *  sits in a circle instead of floating in a two-digit slot. That pairing, a
 *  visible fill around a box wider than its content, is what made `2` look
 *  boxed the first time, and it is the half of it that can go now that the fill
 *  is faint.
 *
 *  A TINT OF THE INK, not a warm neutral, and that is why one value works at
 *  all: the badge sits on `bg-paper` (inactive tab) and `bg-vellum` (active) in
 *  both themes, and no fixed warm value separates from all four — in dark the
 *  warm ground is closest of all to its surroundings. `bg-ink/N` darkens what is
 *  under it in light and lifts it in dark, because `--text-primary` flips with
 *  the theme.
 *
 *  THE COUNT GROWS BY A FIGURE, and that is deliberate. Snugness costs the
 *  two-digit reservation: 11 is one figure wider than 2. That is a real change
 *  in a real number — inventory going from 9 to 10 — not a row appearing and
 *  disappearing under the reader, which is what the no-shift rule is about.
 *  Fixed height throughout, so the strip and the tabs never move vertically.
 *
 *  Presence in the ink as well: `text-ink-secondary`, one step up the ladder
 *  from where this started. `ms-0.5` keeps it off the label's last word. */
export function TabCount({ count }: { count: number }) {
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center ms-0.5 h-[1.125rem] min-w-[1.125rem]
        px-1 rounded-full text-xs font-semibold leading-none tabular-nums text-ink-secondary bg-ink/4"
    >
      {count.toLocaleString()}
    </span>
  );
}
