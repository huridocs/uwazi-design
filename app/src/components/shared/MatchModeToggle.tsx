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
      {/* `-tertiary`, not `-muted`. At 11px this is small text by WCAG's measure
          and muted has never cleared AA on any ground in this palette: on the
          drawer's own `bg-paper` it measured 4.48:1 light and 2.91:1 DARK,
          which is the binding case (see CLAUDE.md — light clears throughout, so
          a colour tuned in light ships broken). Tertiary is the design system's
          quiet-but-readable step: 7.46:1 light, 5.52:1 dark. Same finding, and
          the same resolution, as `SectionLabel` — a caption is the one thing in
          a control that is always small, so it can't afford the quietest ink.
          One caveat for whoever moves this: tertiary clears on paper, warm and
          parchment in both themes, but lands at 4.49:1 on VELLUM in dark. Don't
          set this control on a vellum ground without re-measuring. */}
      <span className="text-meta uppercase tracking-wide text-ink-tertiary">
        {label}
      </span>
      {control}
    </div>
  );
}
