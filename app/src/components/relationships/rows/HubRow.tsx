import { useAtomValue } from "jotai";
import { searchQueryAtom, zoomAtom } from "../../../atoms/filters";
import { getEntity } from "../../../data/entities";
import { relationTypes } from "../../../data/references";
import { Hub } from "../../../utils/relationships";
import { EntityPill } from "../../shared/EntityPill";
import { HighlightedText } from "../../shared/HighlightedText";
import { ListCardRow } from "../../shared/ListCardRow";
import { RowCheckbox } from "./RowCheckbox";
import { EvidenceBadge, RowChevron } from "./RowControls";

export interface HubRowProps {
  hub: Hub;
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Hide the relation-type label in the footer (keeps "N parties"). Used when
   *  the enclosing group already keys on relation type. */
  hideRelLabel?: boolean;
}

/** N-ary hub row. Renders the member entities as inline pills, no direction
 *  glyph (hubs are symmetric — every member relates to every other). The
 *  evidence-count badge mirrors aggregates. */
export function HubRow({ hub, expanded, onToggleExpand, hideRelLabel }: HubRowProps) {
  const zoom = useAtomValue(zoomAtom);
  // Same query that filtered the hub in — marked on the member pills and the
  // relation label, the two things the filter actually reads.
  const query = useAtomValue(searchQueryAtom);
  const relLabel =
    relationTypes.find((r) => r.id === hub.relationType)?.label ??
    hub.relationType.replace("_", " ");

  const memberPills = hub.members.map((m) => {
    const entity = getEntity(m.entityId);
    return (
      <EntityPill
        key={m.entityId}
        typeId={entity?.typeId ?? ""}
        label={entity?.title}
        highlight={query}
      />
    );
  });

  const countBadge = (
    <EvidenceBadge
      count={hub.refIds.length}
      expanded={expanded}
      onActivate={
        onToggleExpand
          ? (e) => {
              e.stopPropagation();
              onToggleExpand();
            }
          : undefined
      }
      ariaLabel={`${hub.refIds.length} ${onToggleExpand ? "evidence " : ""}references`}
      ariaExpanded={onToggleExpand ? !!expanded : undefined}
    />
  );

  const chevron = onToggleExpand ? (
    <RowChevron expanded={expanded} onToggle={onToggleExpand} subject="hub members" />
  ) : null;

  if (zoom === "overview") {
    return (
      <ListCardRow selected={false} ariaLabel={`${relLabel} hub — ${hub.members.length} parties`} onClick={() => onToggleExpand?.()} className="!py-1.5 !border-b-0">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 shrink-0">
            <RowCheckbox refIds={hub.refIds} />
            {chevron}
          </div>
          {/* Overview is the ONE-LINE zoom: pills clip rather than wrap, so every
              row is the same height and the tree stays scannable. */}
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
            {memberPills.slice(0, 3)}
            {hub.members.length > 3 && (
              <span className="text-meta text-ink-tertiary shrink-0">
                +{hub.members.length - 3}
              </span>
            )}
          </div>
          {countBadge}
        </div>
      </ListCardRow>
    );
  }

  // Checkbox + chevron are a GUTTER, and everything else — pills, badges, the
  // caption — is one column beside it. They all used to share a single wrapping
  // flex row: with long titles the pills wrapped to the next line and started at
  // the row's left edge, LEFT of the chevron they belong to, leaving a first line
  // that was just a chevron pointing at nothing. And the caption below indented
  // to yet a third position. Now there are exactly two columns and everything in
  // the second one lines up.
  return (
    <ListCardRow selected={false} ariaLabel={`${relLabel} hub — ${hub.members.length} parties`} onClick={() => onToggleExpand?.()} className={zoom === "compact" ? "!py-2" : ""}>
      <div className="flex items-start gap-1">
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <RowCheckbox refIds={hub.refIds} />
          {chevron}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            {/* items-start, so a clipped pill doesn't stretch its neighbours */}
            <div className="flex flex-wrap items-start gap-1 min-w-0">{memberPills}</div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-meta text-ink-tertiary uppercase tracking-wide">
                hub
              </span>
              {countBadge}
            </div>
          </div>
          {zoom !== "compact" && (
            <div className="flex items-center gap-1 mt-1 text-meta text-ink-tertiary">
              {!hideRelLabel && (
                <>
                  <span className="capitalize">
                    <HighlightedText text={relLabel} query={query} />
                  </span>
                  <span>·</span>
                </>
              )}
              <span>{hub.members.length} parties</span>
            </div>
          )}
        </div>
      </div>
    </ListCardRow>
  );
}
