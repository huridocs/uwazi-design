import { useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ChevronRight, Eye, Link2, Trash2 } from "lucide-react";
import {
  activeRefIdAtom,
  overlayEntityIdAtom,
  scrollToHighlightAtom,
  scrollToRefAtom,
  activeDrawerTabAtom,
} from "../../atoms/references";
import { activeClusterRefIdsAtom, zoomAtom } from "../../atoms/filters";
import { currentPageAtom } from "../../atoms/selection";
import { getEntity, getEntityType } from "../../data/entities";
import { Reference, relationTypes } from "../../data/references";
import { Hub, Relationship } from "../../utils/relationships";
import { EntityPill } from "../shared/EntityPill";
import { FadeTruncate } from "../shared/FadeTruncate";
import { ListCardRow } from "../shared/ListCardRow";
import { PageTag } from "../shared/PageTag";
import { DirectionGlyph } from "./DirectionGlyph";

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
}

interface HubKind {
  kind: "hub";
  hub: Hub;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

type Props = ReferenceKind | AggregateKind | HubKind;

/** Unified row primitive for the merged Relationships panel. Renders a single
 *  text-anchored reference (kind="reference", with snippet + page tag), a
 *  deduped aggregate relationship (kind="aggregate", entity-level with an
 *  evidence-count action), or a hub (kind="hub", n-ary multi-entity row).
 *  Reads zoomAtom to vary row density across detail / compact / overview. */
export function RelationshipRow(props: Props) {
  if (props.kind === "reference") return <ReferenceRow {...props} />;
  if (props.kind === "hub") return <HubRow {...props} />;
  return <AggregateRow {...props} />;
}

function ReferenceRow({ reference, onDelete, nested }: ReferenceKind) {
  const entity = getEntity(reference.targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
  const zoom = useAtomValue(zoomAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const [scrollToRef, setScrollToRef] = useAtom(scrollToRefAtom);
  const [activeRefId, setActiveRefId] = useAtom(activeRefIdAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const [overlayEntityId, setOverlayEntityId] = useAtom(overlayEntityIdAtom);
  const rowRef = useRef<HTMLDivElement>(null);

  // Only this exact row when the user picked it. Don't glow every ref that
  // happens to point at the entity currently shown in the overlay — that
  // floods the panel and steals focus from the row the user actually selected.
  const isActive = activeRefId === reference.id;
  const relLabel =
    relationTypes.find((r) => r.id === reference.relationType)?.label ??
    reference.relationType.replace("_", " ");
  const direction = reference.direction ?? "outgoing";

  useEffect(() => {
    if (scrollToRef === reference.id) {
      setActiveRefId(reference.id);
      rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setScrollToRef(null);
    }
  }, [scrollToRef, reference.id, setScrollToRef, setActiveRefId]);

  const selection = reference.sourceSelection;
  const handleClick = () => {
    setActiveRefId(reference.id);
    if (selection) {
      setCurrentPage(selection.page);
      setScrollToHighlight(reference.id);
    }
  };

  // Overview: single-line, entity pill + page tag only.
  if (zoom === "overview") {
    return (
      <ListCardRow
        ref={rowRef as unknown as React.Ref<HTMLElement>}
        selected={isActive}
        onClick={handleClick}
        className="!py-1.5"
      >
        <div className="flex items-center justify-between gap-2">
          <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
          {selection && (
            <PageTag page={selection.page} onClick={handleClick} />
          )}
        </div>
      </ListCardRow>
    );
  }

  // Compact: single-line, pill + direction + rel label + page tag, no snippet.
  if (zoom === "compact") {
    return (
      <ListCardRow
        ref={rowRef as unknown as React.Ref<HTMLElement>}
        selected={isActive}
        onClick={handleClick}
        className="!py-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
            <DirectionGlyph direction={direction} />
            <span className="text-[10px] text-ink-tertiary truncate capitalize">
              {relLabel}
            </span>
          </div>
          {selection && (
            <PageTag page={selection.page} onClick={handleClick} />
          )}
        </div>
      </ListCardRow>
    );
  }

  // Detail (default): full layout — header, snippet, footer with actions.
  // In nested mode (inside an aggregate's inline-expand), the header pill +
  // typeName and the footer direction + relation label are dropped because
  // the aggregate above already established them. Page tag, snippet, and
  // hover actions stay — those are what actually varies between refs.
  return (
    <ListCardRow
      ref={rowRef as unknown as React.Ref<HTMLElement>}
      selected={isActive}
      onClick={handleClick}
    >
      {!nested && (
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-ink-tertiary">{type?.name ?? ""}</span>
            {selection && (
              <PageTag page={selection.page} onClick={handleClick} />
            )}
          </div>
        </div>
      )}
      {nested ? (
        <div className="flex items-start justify-between gap-2">
          {selection ? (
            <FadeTruncate
              text={selection.text}
              maxLines={2}
              expandable
              className="text-xs text-ink-secondary leading-relaxed flex-1 min-w-0"
              fadeTo={isActive ? "var(--bg-primary)" : undefined}
            />
          ) : (
            <p className="text-xs italic text-ink-tertiary flex-1">
              Entity-level connection — no text anchor
            </p>
          )}
          {selection && (
            <span className="shrink-0">
              <PageTag page={selection.page} onClick={handleClick} />
            </span>
          )}
        </div>
      ) : selection ? (
        <FadeTruncate
          text={selection.text}
          maxLines={2}
          expandable
          className="text-xs text-ink-secondary leading-relaxed"
          fadeTo={isActive ? "var(--bg-primary)" : undefined}
        />
      ) : (
        <p className="text-xs italic text-ink-tertiary">
          Entity-level connection — no text anchor
        </p>
      )}
      <div className="flex items-center justify-between mt-1 text-[10px] text-ink-tertiary">
        {nested ? (
          <span />
        ) : (
          <span className="flex items-center gap-1">
            <DirectionGlyph direction={direction} />
            <span className="capitalize">{relLabel}</span>
          </span>
        )}
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOverlayEntityId(reference.targetEntityId);
            }}
            aria-label="Preview entity"
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-warm text-ink-muted hover:text-ink transition-all cursor-pointer"
          >
            <Eye size={12} />
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(reference.id);
              }}
              aria-label="Delete reference"
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-seal-tint text-ink-muted hover:text-seal transition-all cursor-pointer"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </ListCardRow>
  );
}

function AggregateRow({
  rel,
  expanded,
  onToggleExpand,
  hidePill,
}: AggregateKind) {
  const entity = getEntity(rel.targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
  const zoom = useAtomValue(zoomAtom);
  const [overlayEntityId, setOverlayEntityId] = useAtom(overlayEntityIdAtom);
  const activeRefId = useAtomValue(activeRefIdAtom);
  const setActiveDrawerTab = useSetAtom(activeDrawerTabAtom);
  const setActiveClusterRefIds = useSetAtom(activeClusterRefIdsAtom);

  const relLabel =
    relationTypes.find((r) => r.id === rel.relationType)?.label ??
    rel.relationType.replace("_", " ");
  // The aggregate is "selected" when the user is peeking at its entity in
  // the overlay. When a nested ref is active, that ref row glows; we don't
  // double-glow the parent — it competes with the child and reads as noise.
  const selected = overlayEntityId === rel.targetEntityId;

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
        onClick={() => setOverlayEntityId(rel.targetEntityId)}
        className="!py-1.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {chevron}
            {hidePill ? (
              <span className="flex items-center gap-1.5 text-xs text-ink-secondary capitalize">
                <DirectionGlyph direction={rel.direction} />
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
        onClick={() => setOverlayEntityId(rel.targetEntityId)}
        className="!py-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {chevron}
            <DirectionGlyph direction={rel.direction} />
            {hidePill ? (
              <span className="text-xs text-ink-secondary capitalize truncate">
                {relLabel}
              </span>
            ) : (
              <>
                <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
                <span className="text-[10px] text-ink-tertiary truncate capitalize">
                  {relLabel}
                </span>
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
      onClick={() => setOverlayEntityId(rel.targetEntityId)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {chevron}
          {hidePill ? (
            <>
              <DirectionGlyph direction={rel.direction} />
              <span className="text-sm font-medium text-ink capitalize truncate">
                {relLabel}
              </span>
            </>
          ) : (
            <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!hidePill && (
            <span className="text-[10px] text-ink-tertiary">
              {type?.name ?? ""}
            </span>
          )}
          {countBadge}
        </div>
      </div>
      {!hidePill && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-ink-tertiary">
          <DirectionGlyph direction={rel.direction} />
          <span className="capitalize">{relLabel}</span>
        </div>
      )}
    </ListCardRow>
  );
}

/** N-ary hub row. Renders the member entities as inline pills, no direction
 *  glyph (hubs are symmetric — every member relates to every other). The
 *  evidence-count badge mirrors aggregates. */
function HubRow({ hub, expanded, onToggleExpand }: HubKind) {
  const zoom = useAtomValue(zoomAtom);
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
      />
    );
  });

  const countBadge = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggleExpand?.();
      }}
      aria-label={`${hub.refIds.length} evidence references`}
      aria-expanded={onToggleExpand ? !!expanded : undefined}
      className={`flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium tabular-nums transition-colors cursor-pointer ${
        expanded
          ? "bg-vellum text-ink-secondary"
          : "bg-warm text-ink-tertiary hover:bg-parchment hover:text-ink-secondary"
      }`}
    >
      <Link2 size={10} />
      {hub.refIds.length}
    </button>
  );

  const chevron = onToggleExpand ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggleExpand();
      }}
      aria-label={expanded ? "Collapse hub members" : "Expand hub members"}
      className="shrink-0 p-0.5 -ml-0.5 text-ink-tertiary hover:text-ink cursor-pointer"
    >
      <ChevronRight
        size={12}
        className={`transition-transform ${expanded ? "rotate-90" : ""}`}
      />
    </button>
  ) : null;

  if (zoom === "overview") {
    return (
      <ListCardRow selected={false} onClick={() => onToggleExpand?.()} className="!py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            {chevron}
            {memberPills.slice(0, 3)}
            {hub.members.length > 3 && (
              <span className="text-[10px] text-ink-tertiary">
                +{hub.members.length - 3}
              </span>
            )}
          </div>
          {countBadge}
        </div>
      </ListCardRow>
    );
  }

  return (
    <ListCardRow selected={false} onClick={() => onToggleExpand?.()} className={zoom === "compact" ? "!py-2" : ""}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1 min-w-0 flex-wrap">
          {chevron}
          {memberPills}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-ink-tertiary uppercase tracking-wide">
            hub
          </span>
          {countBadge}
        </div>
      </div>
      {zoom !== "compact" && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-ink-tertiary">
          <span className="capitalize">{relLabel}</span>
          <span>·</span>
          <span>{hub.members.length} parties</span>
        </div>
      )}
    </ListCardRow>
  );
}
