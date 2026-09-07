import type { ReactNode, Ref } from "react";
import { useAtomValue } from "jotai";
import { zoomAtom, type Zoom } from "../../../atoms/filters";
import { ListCardRow } from "../../shared/ListCardRow";

/** Per-tier padding. Overview and compact tighten the row; detail is the
 *  ListCardRow default and adds nothing. */
const TIER_CLASS: Record<Zoom, string> = {
  overview: "!py-1.5",
  compact: "!py-2",
  detail: "",
};

interface RowShellProps {
  selected: boolean;
  ariaLabel?: string;
  onClick: () => void;
  rowRef?: Ref<HTMLElement>;
  /** Overview rows in a TREE drop the row divider — the connector lines are the
   *  structure there, and a second horizontal rule per row reads as noise.
   *  Reference rows keep theirs (they are the list's own leaves). */
  overviewBorderless?: boolean;
  /** The three densities. Each row kind decides what belongs in each; the shell
   *  decides which one is showing and what it sits in. */
  overview: ReactNode;
  compact: ReactNode;
  detail: ReactNode;
}

/** The shell every relationship row shares: read the zoom, pick the tier, and
 *  wrap it in a `ListCardRow` with that tier's padding.
 *
 *  `ReferenceRow`, `AggregateRow` and `HubRow` each hand-rolled this — three
 *  early returns apiece, each repeating the row's selected state, aria-label,
 *  click handler and forwarded ref, with the padding literal typed nine times.
 *  Nine copies of "what does compact mean" is how a tier ends up meaning
 *  something slightly different in one row kind than the others.
 *
 *  The tier CONTENT stays with each row: the difference between a hub's three
 *  clipped pills and an aggregate's direction glyph is the row's business, not
 *  the shell's. */
export function RowShell({
  selected,
  ariaLabel,
  onClick,
  rowRef,
  overviewBorderless = false,
  overview,
  compact,
  detail,
}: RowShellProps) {
  const zoom = useAtomValue(zoomAtom);
  const tier = TIER_CLASS[zoom];
  const className =
    zoom === "overview" && overviewBorderless ? `${tier} !border-b-0` : tier;

  return (
    <ListCardRow
      ref={rowRef}
      selected={selected}
      ariaLabel={ariaLabel}
      onClick={onClick}
      className={className}
    >
      {zoom === "overview" ? overview : zoom === "compact" ? compact : detail}
    </ListCardRow>
  );
}
