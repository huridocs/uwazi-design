import { createContext, useContext, type ReactNode, type Ref } from "react";
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
  /** The row kind, stamped as the row's `data-component`. */
  component: "ReferenceRow" | "AggregateRow" | "HubRow";
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
/** Whether the row is one item of a `RowStack`. Rows render as `li` inside one
 *  and as `div` anywhere else — a tree node, an aggregate's evidence, a story —
 *  because an `li` outside a list is invalid. */
const InRowStack = createContext(false);

/** A list of relationship rows: a `ul` whose rows render as its `li`s. The row
 *  keeps its own box, so `ListCardRow`'s `last:border-b-0` still finds the last
 *  row. */
export function RowStack({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ul data-part="rows" className={className}>
      <InRowStack.Provider value>{children}</InRowStack.Provider>
    </ul>
  );
}

export function RowShell({
  component,
  selected,
  rowRef,
  overviewBorderless = false,
  overview,
  compact,
  detail,
}: RowShellProps) {
  const zoom = useAtomValue(zoomAtom);
  const inStack = useContext(InRowStack);
  const tier = TIER_CLASS[zoom];
  const className =
    zoom === "overview" && overviewBorderless ? `${tier} !border-b-0` : tier;

  return (
    <ListCardRow
      ref={rowRef}
      as={inStack ? "li" : "div"}
      component={component}
      selected={selected}
      className={className}
    >
      {zoom === "overview" ? overview : zoom === "compact" ? compact : detail}
    </ListCardRow>
  );
}
