import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { relExpansionCommandAtom, relGroupStatesAtom } from "../atoms/filters";
import { expandGroupForRefAtom } from "../atoms/references";
import { useRelAtomValue, useRelScopeKey } from "./useEntityScope";

/** The command nonce the enclosing group last obeyed, or null when it was
 *  opened by hand, by a jump, or by default. A group mounting under a parent
 *  that obeyed the current command obeys it too: that is how one Expand all
 *  reaches sub-groups and evidence that only mount once their parent opens,
 *  while a top-level group mounted later (a view switch, a search) keeps its
 *  own default. */
export const ObeyedCommandContext = createContext<number | null>(null);

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
  /** Register in the collapse pair's totals (default true). A tree leaf with no
   *  evidence has no chevron, so it is not a group the pair can open. */
  countable?: boolean;
  /** Clear the jump signal once this group has answered it. The LEAF that
   *  actually holds the ref clears it; a branch on the way down must not, or
   *  the leaves below never see it. */
  clearJumpSignal?: boolean;
  /** Controlled expansion (paired with `onToggle`). Omit to own the state. */
  expanded?: boolean;
  onToggle?: () => void;
}

/** Expand/collapse state for a group in the Relationships panel, and its ties
 *  to the panel: register its open state for the collapse pair, obey Expand all
 *  and Collapse all, open on a jump-to-ref.
 *
 *  `TreeBranch`, `RelationshipGroupedCard` and the tree's aggregate and hub
 *  leaves all use it, so every chevron on the surface answers the same pair.
 *  Wrap the group's children in `ObeyedCommandContext.Provider value={obeyed}`
 *  so groups that mount inside it inherit the command. */
export function useGroupExpansion({
  defaultExpanded = false,
  refIdsToWatch,
  standalone = false,
  countable = true,
  clearJumpSignal = false,
  expanded: controlledExpanded,
  onToggle,
}: GroupExpansionOptions = {}) {
  const command = useRelAtomValue(relExpansionCommandAtom);
  const parentObeyed = useContext(ObeyedCommandContext);
  const inherits = !standalone && command !== null && parentObeyed === command.nonce;
  const [localExpanded, setLocalExpanded] = useState(() =>
    inherits ? command.kind === "expand" : defaultExpanded,
  );
  const [obeyed, setObeyed] = useState<number | null>(inherits ? command.nonce : null);
  // The command in force at mount has already been answered (or, for a group
  // that did not inherit it, was issued before this group existed).
  const answered = useRef(command?.nonce ?? 0);
  const expanded = controlledExpanded ?? localExpanded;

  const id = useId();
  const scopeKey = useRelScopeKey();
  const setStates = useSetAtom(relGroupStatesAtom);
  const registered = !standalone && countable;
  const [expandForRef, setExpandForRef] = useAtom(expandGroupForRefAtom);

  // Hooks stay unconditional; only the bodies gate on `standalone`.
  useEffect(() => {
    if (!registered) return;
    setStates((all) =>
      all[scopeKey]?.[id] === expanded
        ? all
        : { ...all, [scopeKey]: { ...all[scopeKey], [id]: expanded } },
    );
  }, [registered, expanded, scopeKey, id, setStates]);

  useEffect(() => {
    if (!registered) return;
    return () =>
      setStates((all) => {
        if (!all[scopeKey] || !(id in all[scopeKey])) return all;
        const rest = { ...all[scopeKey] };
        delete rest[id];
        return { ...all, [scopeKey]: rest };
      });
  }, [registered, scopeKey, id, setStates]);

  useEffect(() => {
    if (standalone || !command || command.nonce === answered.current) return;
    answered.current = command.nonce;
    setLocalExpanded(command.kind === "expand");
    setObeyed(command.nonce);
  }, [command, standalone]);

  useEffect(() => {
    if (standalone) return;
    if (!expandForRef || !refIdsToWatch || refIdsToWatch.length === 0) return;
    if (refIdsToWatch.includes(expandForRef)) {
      setLocalExpanded(true);
      setObeyed(null);
      if (clearJumpSignal) setExpandForRef(null);
    }
  }, [expandForRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    if (onToggle) {
      onToggle();
      return;
    }
    setLocalExpanded((prev) => !prev);
    setObeyed(null);
  };

  return { expanded, toggle, obeyed };
}

/** The collapse pair's view of this scope's groups. */
export function useGroupTotals(): { expanded: number; total: number } {
  const scopeKey = useRelScopeKey();
  const [all] = useAtom(relGroupStatesAtom);
  const states = Object.values(all[scopeKey] ?? {});
  return { expanded: states.filter(Boolean).length, total: states.length };
}
