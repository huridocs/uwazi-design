import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useGroupExpansion } from "../../hooks/useGroupExpansion";
import { CountBadge } from "../shared/CountBadge";
import { HighlightedText } from "../shared/HighlightedText";

interface Props {
  title: string;
  /** Query whose hits get marked in the group title. Explicit rather than read
   *  from an atom: this shell is also the Library Results card, which filters on
   *  a DIFFERENT query and must not inherit this surface's. */
  highlight?: string;
  color?: string;
  count: number;
  defaultExpanded?: boolean;
  /** Reference IDs this group hosts. When a highlight is clicked in the document
   *  viewer, the corresponding group auto-expands. Leave empty for aggregate
   *  groups that don't carry per-ref evidence directly. */
  refIdsToWatch?: string[];
  /** Reuse OUTSIDE the Relationships panel (e.g. the Library Results tab). Skips
   *  ALL the shared-atom wiring — the expand-all / collapse-all signals, the
   *  jump-to-ref auto-expand, and the CollapseControls group counters — so those
   *  cards neither obey another surface's controls nor pollute its totals. Drive
   *  expansion with `expanded`/`onToggle`, or let it own local state. */
  standalone?: boolean;
  /** Controlled expansion (paired with `onToggle`). Omit for internal state. */
  expanded?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}

/** Single grouped-card primitive used across all grouped views in the merged
 *  Relationships panel (was previously split into GroupedCard +
 *  RelationshipGroupedCard). Children render whatever the parent needs. Pass
 *  `standalone` to reuse it elsewhere without the relationships-panel coupling. */
export function RelationshipGroupedCard({
  title,
  highlight = "",
  color,
  count,
  defaultExpanded = false,
  refIdsToWatch,
  standalone = false,
  expanded: expandedProp,
  onToggle,
  children,
}: Props) {
  // The shared group state machine (see `useGroupExpansion`). This flavour is
  // the LEAF for a jump — it clears the signal once it has opened — and it can
  // be driven from outside (`expanded`/`onToggle`) or run inert (`standalone`).
  const { expanded, toggle } = useGroupExpansion({
    defaultExpanded,
    refIdsToWatch,
    standalone,
    clearJumpSignal: true,
    expanded: expandedProp,
    onToggle,
  });

  return (
    <div className="border border-border/60 rounded-md overflow-hidden bg-paper">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-warm transition-colors"
      >
        <ChevronDown
          size={14}
          className={`text-ink-muted shrink-0 transition-transform ${
            expanded ? "" : "-rotate-90"
          }`}
        />
        {color && (
          <span
            className="w-2 h-2 rounded-[2px] shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-sm font-medium text-ink truncate">
          <HighlightedText text={title} query={highlight} />
        </span>
        <CountBadge count={count} />
      </button>
      {expanded && <div className="border-t border-border/40">{children}</div>}
    </div>
  );
}
