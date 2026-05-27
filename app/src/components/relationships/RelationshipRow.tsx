import { Reference } from "../../data/references";
import { Hub, Relationship } from "../../utils/relationships";
import { ReferenceRow } from "./rows/ReferenceRow";
import { AggregateRow } from "./rows/AggregateRow";
import { HubRow } from "./rows/HubRow";

interface ReferenceKind {
  kind: "reference";
  reference: Reference;
  onDelete?: (id: string) => void;
  /** Hide the entity pill, type name, direction glyph, and relation label.
   *  Used inside an aggregate's inline-expand, where the aggregate header
   *  above already establishes all of those — only page + snippet vary. */
  nested?: boolean;
}

interface AggregateKind {
  kind: "aggregate";
  rel: Relationship;
  /** When provided, the count badge toggles inline expansion instead of jumping
   *  to evidence elsewhere. */
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Hide the entity pill + typeName. Used when the row is nested inside a
   *  group that already keys on this entity (e.g. groupBy = target-entity),
   *  so the pill would just repeat the group header. */
  hidePill?: boolean;
  /** Hide the relation-type label (keeps the direction glyph). Used when the
   *  enclosing group already keys on relation type. */
  hideRelLabel?: boolean;
}

interface HubKind {
  kind: "hub";
  hub: Hub;
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Hide the relation-type label in the hub footer (keeps "N parties"). */
  hideRelLabel?: boolean;
}

type Props = ReferenceKind | AggregateKind | HubKind;

/** Unified row primitive for the merged Relationships panel. Renders a single
 *  text-anchored reference (kind="reference", with snippet + page tag), a
 *  deduped aggregate relationship (kind="aggregate", entity-level with an
 *  evidence-count action), or a hub (kind="hub", n-ary multi-entity row).
 *  Each variant reads `zoomAtom` to vary row density. Implementations live in
 *  `./rows/`. */
export function RelationshipRow(props: Props) {
  if (props.kind === "reference") {
    const { reference, onDelete, nested } = props;
    return <ReferenceRow reference={reference} onDelete={onDelete} nested={nested} />;
  }
  if (props.kind === "hub") {
    const { hub, expanded, onToggleExpand, hideRelLabel } = props;
    return (
      <HubRow
        hub={hub}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        hideRelLabel={hideRelLabel}
      />
    );
  }
  const { rel, expanded, onToggleExpand, hidePill, hideRelLabel } = props;
  return (
    <AggregateRow
      rel={rel}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      hidePill={hidePill}
      hideRelLabel={hideRelLabel}
    />
  );
}
