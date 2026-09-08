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
 *  The row is CHROME, not a control — no click, no stretched primary-action
 *  button, no tab stop. Its two destinations are things you can already see and
 *  point at: the entity pill opens the entity, the page tag goes to the passage,
 *  and each is a real button with its own name. A row-wide target on top of
 *  those would be a third way to do what the pill does, announced as "Open
 *  row", and it made the pill and the tag fire twice.
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
    <ListCardRow ref={rowRef} selected={selected} className={className}>
      {zoom === "overview" ? overview : zoom === "compact" ? compact : detail}
    </ListCardRow>
  );
}
