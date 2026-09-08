import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  activeAggregateIdAtom,
  activeRefIdAtom,
  activeDrawerTabAtom,
  overlayEntityIdAtom,
} from "../../../atoms/references";
import { activeClusterRefIdsAtom, searchQueryAtom } from "../../../atoms/filters";
import { getEntity, getEntityType } from "../../../data/entities";
import { relationTypes } from "../../../data/references";
import { Relationship } from "../../../utils/relationships";
import { EntityTypeTag } from "../../shared/EntityTypeTag";
import { HighlightedText } from "../../shared/HighlightedText";
import { DirectionGlyph } from "../DirectionGlyph";
import { RowCheckbox } from "./RowCheckbox";
import { RowShell } from "./RowShell";
import { EvidenceBadge, RowChevron, RowEntityPill } from "./RowControls";

export interface AggregateRowProps {
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
   *  enclosing group already keys on relation type, so the label would just
   *  repeat the branch header. */
  hideRelLabel?: boolean;
  /** Hide just the colored type pill, keeping the entity title. Used when the
   *  group keys on the target template, so the type pill would repeat the
   *  branch header but the title still varies per leaf. */
  hideTypePill?: boolean;
}

/** Deduped relationship row — one per `(targetEntityId, relationType)` after
 *  `deriveRelationships`. Renders an entity pill, direction glyph (bidirectional
 *  when both incoming and outgoing refs collapsed here), and an evidence count
 *  badge that drills into the backing refs. */
export function AggregateRow({
  rel,
  expanded,
  onToggleExpand,
  hidePill,
  hideRelLabel,
  hideTypePill,
}: AggregateRowProps) {
  const entity = getEntity(rel.targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
  // Mark the query that filtered this row in — same query, same tokenizer as
  // the snippet/PDF marks (`utils/queryTokens.ts`, PATTERNS 4.3).
  const query = useAtomValue(searchQueryAtom);
  const setOverlayEntityId = useSetAtom(overlayEntityIdAtom);
  const [activeAggregateId, setActiveAggregateId] = useAtom(activeAggregateIdAtom);
  const activeRefId = useAtomValue(activeRefIdAtom);
  const setActiveDrawerTab = useSetAtom(activeDrawerTabAtom);
  const setActiveClusterRefIds = useSetAtom(activeClusterRefIdsAtom);

  const relLabel =
    relationTypes.find((r) => r.id === rel.relationType)?.label ??
    rel.relationType.replace("_", " ");
  // Highlight only the aggregate row the user actually clicked, not every
  // sibling pointing at the same entity. Multiple aggregates can share a
  // target entity (one per relation type), so keying selection by entity id
  // would light up all of them. When a nested ref under this aggregate is
  // active, the child row glows instead — parent stays quiet so the two
  // don't compete.
  const selected =
    activeAggregateId === rel.id &&
    !(activeRefId && rel.refIds.includes(activeRefId));
  // Bidirectional when refs in both directions collapsed into this aggregate.
  const glyphDirection: "outgoing" | "incoming" | "both" =
    rel.directions.length > 1 ? "both" : rel.direction;

  const handleEvidenceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand();
      return;
    }
    setActiveClusterRefIds(rel.refIds);
    setActiveDrawerTab("connections");
  };

  // Always a control here — without an inline expand it still routes to the
  // evidence in References, which is why it takes a title either way.
  const countBadge = (
    <EvidenceBadge
      count={rel.evidenceCount}
      expanded={expanded}
      onActivate={handleEvidenceClick}
      ariaLabel={`${rel.evidenceCount} evidence references`}
      ariaExpanded={onToggleExpand ? !!expanded : undefined}
      title={onToggleExpand ? "Toggle evidence" : "View evidence in References"}
    />
  );

  // Chevron prefix: when the row is expandable (tree-view context), prepend a
  // small rotating chevron so the row reads as a drill-down node, not a leaf.
  const chevron = onToggleExpand ? (
    <RowChevron expanded={expanded} onToggle={onToggleExpand} subject="evidence" />
  ) : null;

  /** The pill's job: open the target entity, and mark THIS aggregate as the one
   *  you opened it from. Several aggregates can point at the same entity (one
   *  per relation type), so the highlight keys on the aggregate, not the
   *  entity — which is why the pill can't just take the default open. */
  const openEntity = () => {
    setActiveAggregateId(rel.id);
    setOverlayEntityId(rel.targetEntityId);
  };

  // Overview: pill + count only. When pill is suppressed, surface the
  // relation label so the row still says something useful.
  const overview = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1 min-w-0">
        <RowCheckbox refIds={rel.refIds} />
        {chevron}
        {hidePill ? (
          <span className="flex items-center gap-1.5 text-xs text-ink-secondary capitalize">
            <DirectionGlyph direction={glyphDirection} />
            <HighlightedText text={relLabel} query={query} />
          </span>
        ) : (
          <RowEntityPill
            entityId={rel.targetEntityId}
            typeId={entity?.typeId ?? ""}
            label={entity?.title}
            highlight={query}
            onOpen={openEntity}
          />
        )}
      </div>
      {countBadge}
    </div>
  );

  // Compact: single-line, pill + direction + rel label + count.
  const compact = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <RowCheckbox refIds={rel.refIds} />
        {chevron}
        <DirectionGlyph direction={glyphDirection} />
        {hidePill ? (
          <span className="text-xs text-ink-secondary capitalize truncate">
            <HighlightedText text={relLabel} query={query} />
          </span>
        ) : (
          <>
            {!hideTypePill && (
              <EntityTypeTag typeId={entity?.typeId ?? ""} label={type?.name} />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEntity();
              }}
              aria-label={`Open ${entity?.title ?? "entity"}`}
              title={entity?.title}
              className="text-xs font-medium text-ink truncate min-w-0 text-left cursor-pointer
                hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 rounded"
            >
              <HighlightedText text={entity?.title ?? ""} query={query} />
            </button>
            {!hideRelLabel && (
              <span className="text-meta text-ink-tertiary truncate capitalize shrink-0">
                <HighlightedText text={relLabel} query={query} />
              </span>
            )}
          </>
        )}
      </div>
      {countBadge}
    </div>
  );

  // Detail: full layout — header, footer. With hidePill, the relation label
  // becomes the row's title (capitalized text in the header slot).
  //
  // Checkbox + chevron are a gutter; title and caption share ONE column beside
  // it. The caption used to start at the row's left edge while the title started
  // after the controls, so the two lines of the same row began at different x.
  const detail = (
    <div className="flex items-start gap-1.5">
      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
        <RowCheckbox refIds={rel.refIds} />
        {chevron}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {hidePill ? (
              <>
                <DirectionGlyph direction={glyphDirection} />
                <span className="text-sm font-medium text-ink capitalize truncate">
                  <HighlightedText text={relLabel} query={query} />
                </span>
              </>
            ) : (
              <>
                {!hideTypePill && (
                  <EntityTypeTag typeId={entity?.typeId ?? ""} label={type?.name} />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEntity();
                  }}
                  aria-label={`Open ${entity?.title ?? "entity"}`}
                  title={entity?.title}
                  className="text-sm font-medium text-ink truncate min-w-0 text-left cursor-pointer
                    hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 rounded"
                >
                  <HighlightedText text={entity?.title ?? ""} query={query} />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">{countBadge}</div>
        </div>
        {!hidePill && (
          <div className="flex items-center gap-1 mt-1 text-meta text-ink-tertiary">
            <DirectionGlyph direction={glyphDirection} />
            {!hideRelLabel && (
              <span className="capitalize">
                <HighlightedText text={relLabel} query={query} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <RowShell
      selected={selected}
      overviewBorderless
      overview={overview}
      compact={compact}
      detail={detail}
    />
  );
}
