import { ChevronRight, Link2 } from "lucide-react";
import { useSetAtom } from "jotai";
import { overlayEntityIdAtom } from "../../../atoms/references";
import { EntityPill } from "../../shared/EntityPill";

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

/** The entity pill AS A CONTROL: it opens that entity's preview overlay.
 *
 *  The pill IS the entity, so pressing it is how you ask to see the entity —
 *  which used to be a hover-only eye icon at the row's far edge, discoverable
 *  by hovering the right row with a mouse and by nothing else. Now the thing
 *  you are already pointing at is the thing you press.
 *
 *  It names itself ("Open Case 12.045"): the pill's text alone announces a title
 *  with no hint that pressing it goes anywhere. And it stops propagation, so a
 *  host that does have its own row click can't fire twice. */
export function RowEntityPill({
  entityId,
  typeId,
  label,
  highlight,
  onOpen,
}: {
  entityId: string;
  typeId: string;
  label?: string;
  highlight?: string;
  /** Replaces the default open — for rows that mark themselves selected as they
   *  open (the aggregate row keys its highlight on which aggregate you pressed,
   *  not on which entity is showing). */
  onOpen?: () => void;
}) {
  const setOverlayEntityId = useSetAtom(overlayEntityIdAtom);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onOpen) onOpen();
        else setOverlayEntityId(entityId);
      }}
      aria-label={`Open ${label ?? "entity"}`}
      className="min-w-0 rounded-md cursor-pointer transition-opacity hover:opacity-80
        focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
    >
      <EntityPill typeId={typeId} label={label} highlight={highlight} />
    </button>
  );
}
