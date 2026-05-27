import { Children, ReactNode, useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ChevronRight } from "lucide-react";
import {
  expandAllSignalAtom,
  collapseAllSignalAtom,
  expandedGroupCountAtom,
  totalGroupCountAtom,
  zoomAtom,
} from "../../atoms/filters";
import { expandGroupForRefAtom } from "../../atoms/references";

interface Props {
  title: string;
  color?: string;
  count: number;
  defaultExpanded?: boolean;
  /** Reference IDs this branch hosts (directly or transitively). When the
   *  document viewer's minimap highlights a ref, the branch containing it
   *  auto-expands so the matching aggregate becomes visible. */
  refIdsToWatch?: string[];
  children: ReactNode;
}

/** Tree-node primitive — chevron header on top, indented children below with
 *  vertical + horizontal connector lines drawn into each child. Used as the
 *  group/sub-group shell in RelationshipsTreeView. Each direct child is
 *  wrapped in a connector slot, so the tree reads as an actual tree even
 *  when those children are aggregate rows or fragments. */
export function TreeBranch({
  title,
  color,
  count,
  defaultExpanded = true,
  refIdsToWatch,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandSignal] = useAtom(expandAllSignalAtom);
  const [collapseSignal] = useAtom(collapseAllSignalAtom);
  const setExpandedCount = useSetAtom(expandedGroupCountAtom);
  const setTotalCount = useSetAtom(totalGroupCountAtom);
  const [expandForRef] = useAtom(expandGroupForRefAtom);

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

  // Minimap dot click → activeRefId + collapseAllSignal + expandGroupForRef.
  // If the highlighted ref lives inside this branch, re-open. We don't clear
  // the signal here — leaf AggregateNodes also listen for it.
  useEffect(() => {
    if (!expandForRef || !refIdsToWatch || refIdsToWatch.length === 0) return;
    if (refIdsToWatch.includes(expandForRef)) {
      setExpanded((prev) => {
        if (!prev) setExpandedCount((c) => c + 1);
        return true;
      });
    }
  }, [expandForRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    setExpanded((prev) => {
      setExpandedCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  const items = Children.toArray(children);

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left cursor-pointer hover:bg-warm/60 transition-colors"
      >
        <ChevronRight
          size={12}
          className={`shrink-0 transition-transform ${
            expanded ? "rotate-90 text-ink-secondary" : "text-ink-tertiary"
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
      {expanded && items.length > 0 && (
        // Aligns the vertical guide line below the chevron centre of the
        // header above (chevron is at px-2 + ~6px = ~14px from the wrapper
        // edge; ml-[14px] keeps the line continuous across nested branches).
        <div className="ml-[14px]">
          {items.map((child, i) => (
            <TreeNode key={i}>{child}</TreeNode>
          ))}
        </div>
      )}
    </div>
  );
}

/** Connector slot for a direct child of a TreeBranch — draws a vertical line
 *  along the left edge and a horizontal stub into the child's first row.
 *  The vertical line is clipped on the last child to produce the "L" corner
 *  that closes the branch. Exported so other tree leaves (aggregate rows
 *  with inline-expanded refs) can render their children with the same
 *  connector geometry. */
export function TreeNode({ children }: { children: ReactNode }) {
  // Junction dots are an overview-zoom flourish — the airy, scannable tree.
  // Compact/detail keep plain connectors so the denser rows don't read busy.
  const showDot = useAtomValue(zoomAtom) === "overview";
  return (
    <div
      className={[
        "relative pl-5",
        // Vertical guide: top of this row down to bottom (full height).
        "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0",
        "before:border-l before:border-border-soft",
        // On the last child, cut the vertical short so it ends at the
        // horizontal stub, giving a proper L corner.
        "last:before:bottom-auto last:before:h-[18px]",
        // Horizontal stub aligned with the visual centre of a single-line
        // header (~18px from top of the row). The stub reaches the chevron's
        // left edge — `pl-5` (20px) places the child at x=20; the chevron's
        // own padding nudges its visual left edge to ~22-26px, so a 22px stub
        // meets it cleanly.
        "after:content-[''] after:absolute after:left-0 after:top-[18px] after:w-[22px]",
        "after:border-t after:border-border-soft",
      ].join(" ")}
    >
      {/* Node marker where the stub meets the row — gives the tree the defined
          junction dots from the reference. Centred on the stub end (x≈20,
          y=18) and drawn over the connector lines. Overview only. */}
      {showDot && (
        <span
          aria-hidden
          className="absolute z-[1] rounded-full"
          style={{
            left: "0.95rem",
            top: "1.125rem",
            width: 5,
            height: 5,
            transform: "translateY(-50%)",
            backgroundColor: "var(--border-primary)",
          }}
        />
      )}
      {children}
    </div>
  );
}
