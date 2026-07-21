import { ReactNode, useEffect, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import {
  expandAllSignalAtom,
  collapseAllSignalAtom,
  expandedGroupCountAtom,
  totalGroupCountAtom,
} from "../../atoms/filters";
import { expandGroupForRefAtom } from "../../atoms/references";
import { CountBadge } from "../shared/CountBadge";

interface Props {
  title: string;
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
  color,
  count,
  defaultExpanded = false,
  refIdsToWatch,
  standalone = false,
  expanded: expandedProp,
  onToggle,
  children,
}: Props) {
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const expanded = expandedProp ?? localExpanded;
  const [expandSignal] = useAtom(expandAllSignalAtom);
  const [collapseSignal] = useAtom(collapseAllSignalAtom);
  const setExpandedCount = useSetAtom(expandedGroupCountAtom);
  const setTotalCount = useSetAtom(totalGroupCountAtom);
  const [expandForRef, setExpandForRef] = useAtom(expandGroupForRefAtom);

  // All the shared-atom effects below belong to the Relationships panel only —
  // registering in the CollapseControls counts and obeying its expand/collapse/
  // jump signals. In `standalone` mode they're skipped so a Library Results card
  // is inert to the other surface. (Hooks stay unconditional; only the bodies
  // gate on `standalone`.)
  useEffect(() => {
    if (standalone) return;
    setTotalCount((c) => c + 1);
    if (defaultExpanded) setExpandedCount((c) => c + 1);
    return () => {
      setTotalCount((c) => c - 1);
      if (expanded) setExpandedCount((c) => c - 1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (standalone) return;
    if (expandSignal > 0 && !expanded) {
      setLocalExpanded(true);
      setExpandedCount((c) => c + 1);
    }
  }, [expandSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (standalone) return;
    if (collapseSignal > 0 && expanded) {
      setLocalExpanded(false);
      setExpandedCount((c) => c - 1);
    }
  }, [collapseSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (standalone) return;
    if (!expandForRef || !refIdsToWatch || refIdsToWatch.length === 0) return;
    if (refIdsToWatch.includes(expandForRef)) {
      setLocalExpanded((prev) => {
        if (!prev) setExpandedCount((c) => c + 1);
        return true;
      });
      setExpandForRef(null);
    }
  }, [expandForRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    if (onToggle) {
      onToggle();
      return;
    }
    if (standalone) {
      setLocalExpanded((prev) => !prev);
      return;
    }
    setLocalExpanded((prev) => {
      setExpandedCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

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
        <span className="text-sm font-medium text-ink truncate">{title}</span>
        <CountBadge count={count} />
      </button>
      {expanded && <div className="border-t border-border/40">{children}</div>}
    </div>
  );
}
