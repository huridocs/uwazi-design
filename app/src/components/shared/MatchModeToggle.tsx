/** The AND/OR segmented control that says how a facet's ticked values combine —
 *  every one of them, or any one of them.
 *
 *  There were two, written separately a few hundred lines apart: the one inside
 *  `FacetSection` (drawer flavour, sitting after a "Match" caption) and the one
 *  in `LibraryFilters`' keyword card (header flavour, riding beside "Clear").
 *  They had drifted into the same pixels by coincidence rather than by
 *  reference, and neither named itself to a screen reader: two buttons reading
 *  "AND" and "OR" with nothing saying what they switch, and no pressed state, so
 *  the current mode was carried by a background tint alone.
 *
 *  This is that control, once — with the group named and `aria-pressed` on the
 *  segments, so the mode is announced rather than merely tinted. The optional
 *  `label` is the drawer's "Match" caption; the Library card passes none. */
export type MatchMode = "AND" | "OR";

export function MatchModeToggle({
  mode,
  onChange,
  label,
  groupLabel = "Match mode",
}: {
  mode: MatchMode;
  onChange: (mode: MatchMode) => void;
  /** Visible caption before the control ("Match"). Omit for the bare control. */
  label?: string;
  /** Accessible name for the segment group when there is no visible caption. */
  groupLabel?: string;
}) {
  const control = (
    <div
      role="group"
      aria-label={label ?? groupLabel}
      className="inline-flex items-center gap-0.5 bg-warm rounded-md p-0.5"
    >
      {(["AND", "OR"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={`px-2 h-5 rounded text-meta font-bold tracking-wide transition-colors cursor-pointer ${
            mode === m
              ? "bg-vellum text-ink"
              : "text-ink-tertiary hover:text-ink-secondary"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );

  if (!label) return control;

  return (
    <div className="flex items-center gap-2">
      <span className="text-meta uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      {control}
    </div>
  );
}
