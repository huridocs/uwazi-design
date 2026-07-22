interface ToggleChipProps {
  label: string;
  /** Optional trailing count — the chip's own share of the result set. */
  count?: number;
  /** On = the chip's slice is included. Announced via `aria-pressed`. */
  active: boolean;
  onToggle: () => void;
  /** Type dot, as on `ActiveFilterChip`. */
  color?: string;
  /** Overrides the composed name ("Title, 3 results"). */
  ariaLabel?: string;
}

/** The toggleable sibling of `ActiveFilterChip` — same chip, one behaviour apart.
 *
 *  `ActiveFilterChip` states a filter that IS on and carries an X to drop it;
 *  this one is a switch you flip, so it announces itself with `aria-pressed`
 *  instead. Everything visual is deliberately identical — `h-6`, the same radius,
 *  the same `color-mix` off `--text-primary` for fill and border, logical `ps`/`pe`
 *  padding, the same 11px medium label — because they appear on the same rows and
 *  two chips that differ by a pixel read as a bug.
 *
 *  Off is the muted state: the fill drops away and the label goes tertiary, so an
 *  excluded slice is legible as excluded without a second colour entering the
 *  vocabulary. (Used by the Library's match-type chips — Title / Properties /
 *  Document — in both the drawer's Results tab and the main Results view.) */
export function ToggleChip({
  label,
  count,
  active,
  onToggle,
  color,
  ariaLabel,
}: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={
        ariaLabel ?? (count === undefined ? label : `${label}, ${count.toLocaleString()} results`)
      }
      className={`inline-flex items-center gap-1 h-6 ps-1.5 pe-1.5 rounded text-[11px] font-medium
        transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1
        focus-visible:ring-inset focus-visible:ring-ink/20 ${
          active ? "text-ink-secondary" : "text-ink-tertiary hover:text-ink-secondary"
        }`}
      style={{
        backgroundColor: active
          ? "color-mix(in srgb, var(--text-primary) 6%, var(--bg-surface))"
          : "transparent",
        border: `1px solid color-mix(in srgb, var(--text-primary) ${active ? 14 : 8}%, var(--bg-surface))`,
      }}
    >
      {color && (
        <span className="shrink-0 rounded-[2px] w-1.5 h-1.5" style={{ backgroundColor: color }} />
      )}
      <span className="truncate max-w-40">{label}</span>
      {count !== undefined && (
        <span aria-hidden className="shrink-0 tabular-nums text-ink-tertiary">
          {count.toLocaleString()}
        </span>
      )}
    </button>
  );
}
