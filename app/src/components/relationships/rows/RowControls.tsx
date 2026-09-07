import { ChevronRight, Link2 } from "lucide-react";

/** The disclosure chevron on an expandable row.
 *
 *  `AggregateRow` and `HubRow` drew this identically — same icon, same size,
 *  same rotation, same `-ml-0.5` nudge, same stopPropagation — and differed only
 *  in what they called the thing being opened. */
export function RowChevron({
  expanded,
  onToggle,
  subject,
}: {
  expanded?: boolean;
  onToggle: () => void;
  /** Named in the accessible label: "Expand evidence", "Collapse hub members". */
  subject: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={`${expanded ? "Collapse" : "Expand"} ${subject}`}
      className="shrink-0 p-0.5 -ml-0.5 text-ink-tertiary hover:text-ink cursor-pointer"
    >
      <ChevronRight
        size={12}
        className={`transition-transform ${expanded ? "rotate-90" : ""}`}
      />
    </button>
  );
}

/** The evidence count on an aggregate or hub row — a chain-link glyph and a
 *  number, signalling "relationship between entities" as against the page tag a
 *  reference row carries.
 *
 *  With nothing to act on it is a FACT, not a control: no `onActivate` means a
 *  plain span — no hover, no cursor, no `aria-expanded`, no tab stop. That is
 *  every CEJIL link (entity-to-entity, no quoted passage), and a badge that
 *  hovers but opens an empty box is a promise the row can't keep. */
export function EvidenceBadge({
  count,
  expanded,
  onActivate,
  ariaLabel,
  ariaExpanded,
  title,
}: {
  count: number;
  expanded?: boolean;
  onActivate?: (e: React.MouseEvent) => void;
  ariaLabel: string;
  /** Only when activating actually expands something in place. */
  ariaExpanded?: boolean;
  title?: string;
}) {
  const body = (
    <>
      <Link2 size={10} />
      {count}
    </>
  );
  const base = "flex items-center gap-1 px-1.5 h-5 rounded text-meta font-medium tabular-nums";

  if (!onActivate) {
    return (
      <span aria-label={ariaLabel} className={`${base} bg-warm text-ink-tertiary`}>
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      title={title}
      className={`${base} transition-colors cursor-pointer ${
        expanded
          ? "bg-vellum text-ink-secondary"
          : "bg-warm text-ink-tertiary hover:bg-parchment hover:text-ink-secondary"
      }`}
    >
      {body}
    </button>
  );
}
