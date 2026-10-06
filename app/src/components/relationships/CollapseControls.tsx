import { useSetRelAtom } from "../../hooks/useEntityScope";
import { useGroupTotals } from "../../hooks/useGroupExpansion";
import { nextExpansionCommand, relExpansionCommandAtom } from "../../atoms/filters";

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
  /** Override the group counts (default: the Relationships panel's groups). Pass
   *  these when reusing outside that panel — e.g. the Library Results tab, whose
   *  cards are standalone and keep their own expand state. */
  expandedCount?: number;
  totalCount?: number;
}) {
  const groups = useGroupTotals();
  const expandedCount = expandedProp ?? groups.expanded;
  const totalCount = totalProp ?? groups.total;

  const collapseDisabled = disabled || expandedCount === 0;
  const expandDisabled = disabled || expandedCount >= totalCount;

  return (
    /* Ghost TEXT buttons: no fill at rest or on hover, so the text is their
       visible edge. `px-1` is hit area only; `-mx-1` gives it back, putting
       "Collapse all" and "Expand all" on the row's edges rather than 4px in. */
    <div data-component="CollapseControls" className="flex items-center gap-1 -mx-1">
      <button
        type="button"
        data-part="collapse-all"
        onClick={onCollapseAll}
        disabled={collapseDisabled}
        className={`hit-area-y text-meta font-medium transition-colors px-1 ${
          collapseDisabled
            ? "text-ink-muted cursor-default"
            : "text-ink hover:text-ink-secondary cursor-pointer"
        }`}
      >
        Collapse all
      </button>
      <button
        type="button"
        data-part="expand-all"
        onClick={onExpandAll}
        disabled={expandDisabled}
        className={`hit-area-y text-meta font-medium transition-colors px-1 ${
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
 *  on that surface renders. Enablement comes from the groups on screen in this
 *  scope (`useGroupTotals`), so a view with nothing to open (graph, when, an
 *  ungrouped list, a tree of leaves with no evidence) shows the pair disabled
 *  rather than removing it. */
export function RelationshipsCollapseControls() {
  const setCommand = useSetRelAtom(relExpansionCommandAtom);
  return (
    <CollapseControls
      onExpandAll={() => setCommand(nextExpansionCommand("expand"))}
      onCollapseAll={() => setCommand(nextExpansionCommand("collapse"))}
    />
  );
}
