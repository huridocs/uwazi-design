import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Relationship } from "../../utils/relationships";
import { CountBadge } from "../shared/CountBadge";
import { RelationshipRow } from "./RelationshipRow";
import {
  expandAllSignalAtom,
  collapseAllSignalAtom,
  expandedGroupCountAtom,
  totalGroupCountAtom,
} from "../../atoms/filters";

interface RelationshipGroupedCardProps {
  title: string;
  color?: string;
  relationships: Relationship[];
  defaultExpanded?: boolean;
}

export function RelationshipGroupedCard({
  title,
  color,
  relationships,
  defaultExpanded = false,
}: RelationshipGroupedCardProps) {
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
    <div className="border border-border/60 rounded-md overflow-hidden bg-paper">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-warm transition-colors"
      >
        <ChevronDown
          size={14}
          className={`text-ink-muted shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
        {color && (
          <span
            className="w-2 h-2 rounded-[2px] shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-sm font-medium text-ink truncate">{title}</span>
        <CountBadge count={relationships.length} />
      </button>
      {expanded && (
        <div className="border-t border-border/40">
          {relationships.map((rel) => (
            <RelationshipRow key={rel.id} relationship={rel} />
          ))}
        </div>
      )}
    </div>
  );
}
