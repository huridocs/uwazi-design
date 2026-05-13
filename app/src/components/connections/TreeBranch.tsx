import { ReactNode, useEffect, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { ChevronRight } from "lucide-react";
import {
  expandAllSignalAtom,
  collapseAllSignalAtom,
  expandedGroupCountAtom,
  totalGroupCountAtom,
} from "../../atoms/filters";

interface Props {
  title: string;
  color?: string;
  count: number;
  defaultExpanded?: boolean;
  children: ReactNode;
}

/** Tree-node primitive — chevron header on top, indented children below with
 *  a vertical guide line for visual hierarchy. Used as the group/sub-group
 *  shell in RelationshipsTreeView. Card-style alternative is
 *  ConnectionGroupedCard. */
export function TreeBranch({
  title,
  color,
  count,
  defaultExpanded = true,
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

  const toggle = () => {
    setExpanded((prev) => {
      setExpandedCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-warm rounded text-left cursor-pointer transition-colors"
      >
        <ChevronRight
          size={12}
          className={`text-ink-tertiary shrink-0 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
        {color && (
          <span
            className="w-2 h-2 rounded-[2px] shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-sm font-medium text-ink truncate">{title}</span>
        <span className="ml-auto text-[11px] text-ink-tertiary tabular-nums shrink-0">
          {count}
        </span>
      </button>
      {expanded && (
        <div className="ml-[10px] pl-3 border-l border-border-soft">
          {children}
        </div>
      )}
    </div>
  );
}
