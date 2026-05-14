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
  children: ReactNode;
}

/** Single grouped-card primitive used across all grouped views in the merged
 *  Relationships panel (was previously split into GroupedCard +
 *  RelationshipGroupedCard). Children render whatever the parent needs. */
export function RelationshipGroupedCard({
  title,
  color,
  count,
  defaultExpanded = false,
  refIdsToWatch,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandSignal] = useAtom(expandAllSignalAtom);
  const [collapseSignal] = useAtom(collapseAllSignalAtom);
  const setExpandedCount = useSetAtom(expandedGroupCountAtom);
  const setTotalCount = useSetAtom(totalGroupCountAtom);

  useEffect(() => {
    setTotalCount((c) => c + 1);
    if (defaultExpanded) setExpandedCount((c) => c + 1);
    return () => {
      setTotalCount((c) => c - 1);
      if (expanded) setExpandedCount((c) => c - 1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (expandSignal > 0 && !expanded) {
      setExpanded(true);
      setExpandedCount((c) => c + 1);
    }
  }, [expandSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (collapseSignal > 0 && expanded) {
      setExpanded(false);
      setExpandedCount((c) => c - 1);
    }
  }, [collapseSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const [expandForRef, setExpandForRef] = useAtom(expandGroupForRefAtom);
  useEffect(() => {
    if (!expandForRef || !refIdsToWatch || refIdsToWatch.length === 0) return;
    if (refIdsToWatch.includes(expandForRef)) {
      setExpanded((prev) => {
        if (!prev) setExpandedCount((c) => c + 1);
        return true;
      });
      setExpandForRef(null);
    }
  }, [expandForRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    setExpanded((prev) => {
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
