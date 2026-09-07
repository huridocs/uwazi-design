import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  expandedGroupCountAtom,
  totalGroupCountAtom,
  viewAtom,
  groupByAtom,
  expandAllSignalAtom,
  collapseAllSignalAtom,
} from "../../atoms/filters";

export function CollapseControls({
  onCollapseAll,
  onExpandAll,
  disabled = false,
  expandedCount: expandedProp,
  totalCount: totalProp,
}: {
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  disabled?: boolean;
  /** Override the group counts (default: the relationships-panel atoms). Pass
   *  these when reusing outside that panel — e.g. the Library Results tab, whose
   *  cards are standalone and keep their own expand state. */
  expandedCount?: number;
  totalCount?: number;
}) {
  const [expandedAtom] = useAtom(expandedGroupCountAtom);
  const [totalAtom] = useAtom(totalGroupCountAtom);
  const expandedCount = expandedProp ?? expandedAtom;
  const totalCount = totalProp ?? totalAtom;

  const collapseDisabled = disabled || expandedCount === 0;
  const expandDisabled =
    disabled || (totalCount > 0 && expandedCount >= totalCount);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onCollapseAll}
        disabled={collapseDisabled}
        className={`text-meta font-medium transition-colors px-1 ${
          collapseDisabled
            ? "text-ink-muted cursor-default"
            : "text-ink hover:text-ink-secondary cursor-pointer"
        }`}
      >
        Collapse all
      </button>
      <button
        onClick={onExpandAll}
        disabled={expandDisabled}
        className={`text-meta font-medium transition-colors px-1 ${
          expandDisabled
            ? "text-ink-muted cursor-default"
            : "text-ink hover:text-ink-secondary cursor-pointer"
        }`}
      >
        Expand all
      </button>
    </div>
  );
}

/** `CollapseControls` wired to the Relationships panel — the version every host
 *  on that surface should render.
 *
 *  The pair used to be wired twice, in two `ListInfoRow`s that had nothing else
 *  left to carry: the list body's and the tree's, each computing its own
 *  `showCollapse` from a different expression (`view === "list" && groupBy !==
 *  "none"` against a bare `groupBy !== "none"`) for what is one question. Both
 *  rows are gone and the controls moved to the footer, so the rule lives here
 *  once — and the answer is the same in every view because it is the same code
 *  answering.
 *
 *  Graph is the view with no groups to collapse, and it now says so with a
 *  DISABLED pair rather than by not being there: the body used to return early
 *  before the row, so the controls vanished in graph and reappeared in list,
 *  which reads as the bar losing a control rather than the view not having
 *  groups. */
export function RelationshipsCollapseControls() {
  const view = useAtomValue(viewAtom);
  const groupBy = useAtomValue(groupByAtom);
  const setExpandSignal = useSetAtom(expandAllSignalAtom);
  const setCollapseSignal = useSetAtom(collapseAllSignalAtom);

  return (
    <CollapseControls
      disabled={view === "graph" || groupBy === "none"}
      onExpandAll={() => setExpandSignal((s) => s + 1)}
      onCollapseAll={() => setCollapseSignal((s) => s + 1)}
    />
  );
}
