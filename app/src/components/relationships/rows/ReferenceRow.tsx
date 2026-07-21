import { useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Eye, Trash2 } from "lucide-react";
import {
  activeRefIdAtom,
  overlayEntityIdAtom,
  scrollToHighlightAtom,
  scrollToRefAtom,
} from "../../../atoms/references";
import { searchQueryAtom, zoomAtom } from "../../../atoms/filters";
import { currentPageAtom } from "../../../atoms/selection";
import { getEntity, getEntityType } from "../../../data/entities";
import { Reference, relationTypes } from "../../../data/references";
import { EntityPill } from "../../shared/EntityPill";
import { FadeTruncate } from "../../shared/FadeTruncate";
import { HighlightedText } from "../../shared/HighlightedText";
import { ListCardRow } from "../../shared/ListCardRow";
import { PageTag } from "../../shared/PageTag";
import { DirectionGlyph } from "../DirectionGlyph";
import { RowCheckbox } from "./RowCheckbox";

export interface ReferenceRowProps {
  reference: Reference;
  onDelete?: (id: string) => void;
  /** Hide the entity pill, type name, direction glyph, and relation label.
   *  Used inside an aggregate's inline-expand, where the aggregate header
   *  above already establishes all of those — only page + snippet vary. */
  nested?: boolean;
}

/** Single text-anchored (or entity-level) reference row. Reads `zoomAtom` to
 *  switch between detail / compact / overview densities. */
export function ReferenceRow({ reference, onDelete, nested }: ReferenceRowProps) {
  const entity = getEntity(reference.targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
  const zoom = useAtomValue(zoomAtom);
  // The row marks the SAME query that filtered it in (`useFilteredReferences`
  // matches snippet text + target title + relation type), so the user can see
  // WHY a row is here instead of re-reading it to find the term.
  const query = useAtomValue(searchQueryAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const [scrollToRef, setScrollToRef] = useAtom(scrollToRefAtom);
  const [activeRefId, setActiveRefId] = useAtom(activeRefIdAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const setOverlayEntityId = useSetAtom(overlayEntityIdAtom);
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
        ariaLabel={`Reference to ${entity?.title ?? "unknown entity"}${
          selection ? `, page ${selection.page}` : ""
        }`}
        onClick={handleClick}
        className="!py-1.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <RowCheckbox refIds={[reference.id]} />
            <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} highlight={query} />
          </div>
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
        ariaLabel={`Reference to ${entity?.title ?? "unknown entity"}${
          selection ? `, page ${selection.page}` : ""
        }`}
        onClick={handleClick}
        className="!py-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <RowCheckbox refIds={[reference.id]} />
            <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} highlight={query} />
            <DirectionGlyph direction={direction} />
            <span className="text-[10px] text-ink-tertiary truncate capitalize">
              <HighlightedText text={relLabel} query={query} />
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
      ariaLabel={`Reference to ${entity?.title ?? "unknown entity"}${
        selection ? `, page ${selection.page}` : ""
      }`}
      onClick={handleClick}
    >
      {!nested && (
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <RowCheckbox refIds={[reference.id]} />
            <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} highlight={query} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-ink-tertiary">{type?.name ?? ""}</span>
            {selection && (
              <PageTag page={selection.page} onClick={handleClick} />
            )}
          </div>
        </div>
      )}
      {selection ? (
        nested ? (
          // Evidence-card treatment: indented warm bg + italic snippet. Reads
          // as "a quoted passage supporting the relationship above" via
          // typography and surface, no decorative glyph needed.
          <div className="flex items-start justify-between gap-2 px-2 py-1.5 bg-warm/50 rounded">
            <FadeTruncate
              text={selection.text}
              maxLines={2}
              expandable
              highlight={query}
              className="text-xs text-ink-secondary leading-relaxed flex-1 min-w-0 italic"
              fadeTo={isActive ? "var(--bg-primary)" : "var(--bg-warm)"}
            />
            <span className="shrink-0">
              <PageTag page={selection.page} onClick={handleClick} />
            </span>
          </div>
        ) : (
          <FadeTruncate
            text={selection.text}
            maxLines={2}
            expandable
            highlight={query}
            className="text-xs text-ink-secondary leading-relaxed"
            fadeTo={isActive ? "var(--bg-primary)" : undefined}
          />
        )
      ) : null}
      {/* Text↔text: the anchor on the TARGET's own document, as a second,
          quieter snippet — labelled so the two quotes read as the two ends
          of one relationship. */}
      {reference.targetSelection && (
        <div className="flex items-start justify-between gap-2 px-2 py-1.5 mt-1.5 bg-warm/50 rounded">
          <FadeTruncate
            text={reference.targetSelection.text}
            maxLines={2}
            expandable
            highlight={query}
            className="text-xs text-ink-secondary leading-relaxed flex-1 min-w-0 italic"
            fadeTo={isActive ? "var(--bg-primary)" : "var(--bg-warm)"}
          />
          <span className="shrink-0 flex items-center gap-1">
            <span className="text-[10px] text-ink-tertiary">target</span>
            <PageTag page={reference.targetSelection.page} />
          </span>
        </div>
      )}
      <div className="flex items-center justify-between mt-1 text-[10px] text-ink-tertiary">
        {nested ? (
          <span />
        ) : (
          <span className="flex items-center gap-1">
            <DirectionGlyph direction={direction} />
            <span className="capitalize">
              <HighlightedText text={relLabel} query={query} />
            </span>
          </span>
        )}
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOverlayEntityId(reference.targetEntityId);
            }}
            aria-label="Preview entity"
            className="p-1 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-warm text-ink-muted hover:text-ink transition-all cursor-pointer"
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
              className="p-1 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-seal-tint text-ink-muted hover:text-seal transition-all cursor-pointer"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </ListCardRow>
  );
}
