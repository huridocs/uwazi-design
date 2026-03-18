import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Reference } from "../../data/references";
import { CountBadge } from "../shared/CountBadge";
import { RefRow } from "./RefRow";
import {
  expandAllSignalAtom,
  collapseAllSignalAtom,
  expandedGroupCountAtom,
  totalGroupCountAtom,
} from "../../atoms/filters";

interface GroupedCardProps {
  title: string;
  color?: string;
  references: Reference[];
  onDeleteRef: (id: string) => void;
  defaultExpanded?: boolean;
}

export function GroupedCard({
  title,
  color,
  references,
  onDeleteRef,
  defaultExpanded = false,
}: GroupedCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandSignal] = useAtom(expandAllSignalAtom);
  const [collapseSignal] = useAtom(collapseAllSignalAtom);
  const setExpandedCount = useSetAtom(expandedGroupCountAtom);
  const setTotalCount = useSetAtom(totalGroupCountAtom);

  // Register/unregister group on mount/unmount
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
    if (expandSignal > 0) {
      if (!expanded) {
        setExpanded(true);
        setExpandedCount((c) => c + 1);
      }
    }
  }, [expandSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (collapseSignal > 0) {
      if (expanded) {
        setExpanded(false);
        setExpandedCount((c) => c - 1);
      }
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
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-sm font-medium text-ink truncate">{title}</span>
        <CountBadge count={references.length} />
      </button>
      {expanded && (
        <div className="border-t border-border/40">
          {references.map((ref) => (
            <RefRow key={ref.id} reference={ref} onDelete={onDeleteRef} />
          ))}
        </div>
      )}
    </div>
  );
}
