import { useEffect, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  expandAllSignalAtom,
  collapseAllSignalAtom,
  expandedGroupCountAtom,
  totalGroupCountAtom,
} from "../atoms/filters";
import { expandGroupForRefAtom } from "../atoms/references";

interface GroupExpansionOptions {
  /** Open on mount. Branches default open, cards default closed. */
  defaultExpanded?: boolean;
  /** Reference IDs this group hosts, directly or transitively. When the
   *  document viewer's minimap sends a jump (`expandGroupForRefAtom`), a group
   *  holding that ref opens so the row becomes visible. */
  refIdsToWatch?: string[];
  /** Reuse OUTSIDE the Relationships panel (the Library Results card). Skips
   *  ALL the shared-atom wiring — expand-all / collapse-all, the jump, and the
   *  CollapseControls counters — so those cards neither obey another surface's
   *  controls nor pollute its totals. */
  standalone?: boolean;
  /** Clear the jump signal once this group has answered it. The LEAF that
   *  actually holds the ref clears it; a branch on the way down must not, or
   *  the leaves below never see it. */
  clearJumpSignal?: boolean;
  /** Controlled expansion (paired with `onToggle`). Omit to own the state. */
  expanded?: boolean;
  onToggle?: () => void;
}

/** Expand/collapse state for a group in the Relationships panel, and its four
 *  ties to the shared signal atoms: register in the CollapseControls counts on
 *  mount, obey expand-all, obey collapse-all, open on a jump-to-ref.
 *
 *  `TreeBranch` and `RelationshipGroupedCard` each carried their own copy of
 *  all four — the same effects, the same counter arithmetic, the same
 *  eslint-disabled dependency lists — differing only in the connector visuals
 *  around them and in whether they clear the jump signal. Two copies of a
 *  state machine wired to five atoms is how one of them silently stops
 *  answering a control the other still obeys.
 *
 *  The counters are incremented and decremented by the caller's own
 *  transitions, never recomputed, so this hook must own every path that flips
 *  `expanded` — which is why `toggle` comes back from here too. */
export function useGroupExpansion({
  defaultExpanded = false,
  refIdsToWatch,
  standalone = false,
  clearJumpSignal = false,
  expanded: controlledExpanded,
  onToggle,
}: GroupExpansionOptions = {}) {
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const expanded = controlledExpanded ?? localExpanded;
  const [expandSignal] = useAtom(expandAllSignalAtom);
  const [collapseSignal] = useAtom(collapseAllSignalAtom);
  const setExpandedCount = useSetAtom(expandedGroupCountAtom);
  const setTotalCount = useSetAtom(totalGroupCountAtom);
  const [expandForRef, setExpandForRef] = useAtom(expandGroupForRefAtom);

  // Hooks stay unconditional; only the bodies gate on `standalone`.
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
      if (clearJumpSignal) setExpandForRef(null);
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

  return { expanded, toggle };
}

/** A tree LEAF's answer to the same jump: open, then clear the signal so the
 *  next jump starts clean. No counters — a leaf's inline evidence is not one of
 *  the groups CollapseControls counts, and never was.
 *
 *  `HubNode` and `AggregateNode` hand-rolled this identically, one per node
 *  type, differing only in which id list they matched against. */
export function useAutoExpandOnRefJump(refIds: string[]) {
  const [expanded, setExpanded] = useState(false);
  const [expandForRef, setExpandForRef] = useAtom(expandGroupForRefAtom);

  useEffect(() => {
    if (!expandForRef) return;
    if (refIds.includes(expandForRef)) {
      if (!expanded) setExpanded(true);
      setExpandForRef(null);
    }
  }, [expandForRef]); // eslint-disable-line react-hooks/exhaustive-deps

  return { expanded, toggle: () => setExpanded((e) => !e) };
}
