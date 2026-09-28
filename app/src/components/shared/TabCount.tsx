/** The inventory count beside a tab's label ("Relationships 456", "Files 2").
 *
 *  An inventory count stays quieter than its label: no carbon or seal.
 *  `bg-ink/4`, `rounded-full`, `min-w` equal to the height: a faint tint of the
 *  ink, which reads on `bg-paper` and `bg-vellum` in both themes because
 *  `--text-primary` flips with the theme; no fixed warm value separates from all
 *  four. The box widens with each added digit; the height is fixed so the strip
 *  never moves vertically. */
export function TabCount({ count }: { count: number }) {
  return (
    <span
      data-component="TabCount"
      className="shrink-0 inline-flex items-center justify-center ms-0.5 h-[1.125rem] min-w-[1.125rem]
        px-1 rounded-full text-xs font-semibold leading-none tabular-nums text-ink-secondary bg-ink/4"
    >
      {count.toLocaleString()}
    </span>
  );
}
