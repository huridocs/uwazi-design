import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ChevronRight, Link2 } from "lucide-react";
import {
  activeAggregateIdAtom,
  activeRefIdAtom,
  activeDrawerTabAtom,
  overlayEntityIdAtom,
} from "../../../atoms/references";
import { activeClusterRefIdsAtom, zoomAtom } from "../../../atoms/filters";
import { getEntity, getEntityType } from "../../../data/entities";
import { relationTypes } from "../../../data/references";
import { Relationship } from "../../../utils/relationships";
import { EntityPill } from "../../shared/EntityPill";
import { EntityTypeTag } from "../../shared/EntityTypeTag";
import { ListCardRow } from "../../shared/ListCardRow";
import { DirectionGlyph } from "../DirectionGlyph";
import { RowCheckbox } from "./RowCheckbox";

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
  const zoom = useAtomValue(zoomAtom);
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

  // Chain-link icon signals "relationship between entities" — distinct from
  // the page-tag pill that references use.
  const countBadge = (
    <button
      type="button"
      onClick={handleEvidenceClick}
      aria-label={`${rel.evidenceCount} evidence references`}
      aria-expanded={onToggleExpand ? !!expanded : undefined}
      title={
        onToggleExpand ? "Toggle evidence" : "View evidence in References"
      }
      className={`flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium tabular-nums transition-colors cursor-pointer ${
        expanded
          ? "bg-vellum text-ink-secondary"
          : "bg-warm text-ink-tertiary hover:bg-parchment hover:text-ink-secondary"
      }`}
    >
      <Link2 size={10} />
      {rel.evidenceCount}
    </button>
  );

  // Chevron prefix: when the row is expandable (tree-view context), prepend a
  // small rotating chevron so the row reads as a drill-down node, not a leaf.
  const chevron = onToggleExpand ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggleExpand();
      }}
      aria-label={expanded ? "Collapse evidence" : "Expand evidence"}
      className="shrink-0 p-0.5 -ml-0.5 text-ink-tertiary hover:text-ink cursor-pointer"
    >
      <ChevronRight
        size={12}
        className={`transition-transform ${expanded ? "rotate-90" : ""}`}
      />
    </button>
  ) : null;

  // Overview: pill + count only. When pill is suppressed, surface the
  // relation label so the row still says something useful.
  if (zoom === "overview") {
    return (
      <ListCardRow
        selected={selected}
        ariaLabel={`${entity?.title ?? "Unknown entity"} — ${relLabel}`}
        onClick={() => {
          setActiveAggregateId(rel.id);
          setOverlayEntityId(rel.targetEntityId);
        }}
        className="!py-1.5 !border-b-0"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <RowCheckbox refIds={rel.refIds} />
            {chevron}
            {hidePill ? (
              <span className="flex items-center gap-1.5 text-xs text-ink-secondary capitalize">
                <DirectionGlyph direction={glyphDirection} />
                {relLabel}
              </span>
            ) : (
              <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
            )}
          </div>
          {countBadge}
        </div>
      </ListCardRow>
    );
  }

  // Compact: single-line, pill + direction + rel label + count.
  if (zoom === "compact") {
    return (
      <ListCardRow
        selected={selected}
        ariaLabel={`${entity?.title ?? "Unknown entity"} — ${relLabel}`}
        onClick={() => {
          setActiveAggregateId(rel.id);
          setOverlayEntityId(rel.targetEntityId);
        }}
        className="!py-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <RowCheckbox refIds={rel.refIds} />
            {chevron}
            <DirectionGlyph direction={glyphDirection} />
            {hidePill ? (
              <span className="text-xs text-ink-secondary capitalize truncate">
                {relLabel}
              </span>
            ) : (
              <>
                {!hideTypePill && (
                  <EntityTypeTag typeId={entity?.typeId ?? ""} label={type?.name} />
                )}
                <span
                  title={entity?.title}
                  className="text-xs font-medium text-ink truncate min-w-0"
                >
                  {entity?.title}
                </span>
                {!hideRelLabel && (
                  <span className="text-[10px] text-ink-tertiary truncate capitalize shrink-0">
                    {relLabel}
                  </span>
                )}
              </>
            )}
          </div>
          {countBadge}
        </div>
      </ListCardRow>
    );
  }

  // Detail: full layout — header, footer. With hidePill, the relation label
  // becomes the row's title (capitalized text in the header slot).
  return (
    <ListCardRow
      selected={selected}
      onClick={() => {
          setActiveAggregateId(rel.id);
          setOverlayEntityId(rel.targetEntityId);
        }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <RowCheckbox refIds={rel.refIds} />
          {chevron}
          {hidePill ? (
            <>
              <DirectionGlyph direction={glyphDirection} />
              <span className="text-sm font-medium text-ink capitalize truncate">
                {relLabel}
              </span>
            </>
          ) : (
            <>
              {!hideTypePill && (
                <EntityTypeTag typeId={entity?.typeId ?? ""} label={type?.name} />
              )}
              <span
                title={entity?.title}
                className="text-sm font-medium text-ink truncate min-w-0"
              >
                {entity?.title}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {countBadge}
        </div>
      </div>
      {!hidePill && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-ink-tertiary">
          <DirectionGlyph direction={glyphDirection} />
          {!hideRelLabel && <span className="capitalize">{relLabel}</span>}
        </div>
      )}
    </ListCardRow>
  );
}
