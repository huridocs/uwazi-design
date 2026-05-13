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
import { Relationship } from "../../utils/relationships";
import { EntityPill } from "../shared/EntityPill";
import { FadeTruncate } from "../shared/FadeTruncate";
import { ListCardRow } from "../shared/ListCardRow";
import { PageTag } from "../shared/PageTag";
import { DirectionGlyph } from "./DirectionGlyph";

interface ReferenceKind {
  kind: "reference";
  reference: Reference;
  onDelete?: (id: string) => void;
}

interface AggregateKind {
  kind: "aggregate";
  rel: Relationship;
  /** When provided, the count badge toggles inline expansion instead of jumping
   *  to evidence elsewhere. */
  expanded?: boolean;
  onToggleExpand?: () => void;
}

type Props = ReferenceKind | AggregateKind;

/** Unified row primitive for the merged Relationships panel. Renders a single
 *  text-anchored reference (kind="reference", with snippet + page tag) or a
 *  deduped aggregate relationship (kind="aggregate", entity-level with an
 *  evidence-count action). Reads zoomAtom to vary row density across
 *  detail / compact / overview. */
export function ConnectionRow(props: Props) {
  if (props.kind === "reference") {
    return <ReferenceRow {...props} />;
  }
  return <AggregateRow {...props} />;
}

function ReferenceRow({ reference, onDelete }: ReferenceKind) {
  const entity = getEntity(reference.targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
  const zoom = useAtomValue(zoomAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const [scrollToRef, setScrollToRef] = useAtom(scrollToRefAtom);
  const [activeRefId, setActiveRefId] = useAtom(activeRefIdAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const [overlayEntityId, setOverlayEntityId] = useAtom(overlayEntityIdAtom);
  const rowRef = useRef<HTMLDivElement>(null);

  const isActive =
    activeRefId === reference.id || overlayEntityId === reference.targetEntityId;
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

  const handleClick = () => {
    setActiveRefId(reference.id);
    setCurrentPage(reference.sourceSelection.page);
    setScrollToHighlight(reference.id);
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
          <PageTag page={reference.sourceSelection.page} onClick={handleClick} />
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
          <PageTag page={reference.sourceSelection.page} onClick={handleClick} />
        </div>
      </ListCardRow>
    );
  }

  // Detail (default): full layout — header, snippet, footer with actions.
  return (
    <ListCardRow
      ref={rowRef as unknown as React.Ref<HTMLElement>}
      selected={isActive}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-ink-tertiary">{type?.name ?? ""}</span>
          <PageTag page={reference.sourceSelection.page} onClick={handleClick} />
        </div>
      </div>
      <FadeTruncate
        text={reference.sourceSelection.text}
        maxLines={2}
        expandable
        className="text-xs text-ink-secondary leading-relaxed"
        fadeTo={isActive ? "var(--bg-primary)" : undefined}
      />
      <div className="flex items-center justify-between mt-1 text-[10px] text-ink-tertiary">
        <span className="flex items-center gap-1">
          <DirectionGlyph direction={direction} />
          <span className="capitalize">{relLabel}</span>
        </span>
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

function AggregateRow({ rel, expanded, onToggleExpand }: AggregateKind) {
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
  const selected =
    overlayEntityId === rel.targetEntityId ||
    (activeRefId !== null && rel.refIds.includes(activeRefId));

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
          ? "bg-ink text-paper"
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

  // Overview: pill + count only.
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
            <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
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
          <div className="flex items-center gap-1 min-w-0">
            {chevron}
            <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
            <DirectionGlyph direction={rel.direction} />
            <span className="text-[10px] text-ink-tertiary truncate capitalize">
              {relLabel}
            </span>
          </div>
          {countBadge}
        </div>
      </ListCardRow>
    );
  }

  // Detail: full layout — header, footer.
  return (
    <ListCardRow
      selected={selected}
      onClick={() => setOverlayEntityId(rel.targetEntityId)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1 min-w-0">
          {chevron}
          <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-ink-tertiary">{type?.name ?? ""}</span>
          {countBadge}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1 text-[10px] text-ink-tertiary">
        <DirectionGlyph direction={rel.direction} />
        <span className="capitalize">{relLabel}</span>
      </div>
    </ListCardRow>
  );
}
