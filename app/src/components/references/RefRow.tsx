import { Trash2, Eye } from "lucide-react";
import { Reference, relationTypes } from "../../data/references";
import { getEntity, getEntityType } from "../../data/entities";
import { EntityPill } from "../shared/EntityPill";
import { PageTag } from "../shared/PageTag";
import { FadeTruncate } from "../shared/FadeTruncate";
import { useSetAtom, useAtom } from "jotai";
import { scrollToHighlightAtom, scrollToRefAtom, activeRefIdAtom, overlayEntityIdAtom } from "../../atoms/references";
import { currentPageAtom } from "../../atoms/selection";
import { useEffect, useRef } from "react";

interface RefRowProps {
  reference: Reference;
  onDelete: (id: string) => void;
}

export function RefRow({ reference, onDelete }: RefRowProps) {
  const entity = getEntity(reference.targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
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

  // Scroll into view and activate when highlight clicked in document
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

  const handlePageClick = () => {
    setActiveRefId(reference.id);
    setCurrentPage(reference.sourceSelection.page);
    setScrollToHighlight(reference.id);
  };

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      className={`group px-3 py-2.5 border-b border-border/50 last:border-b-0 cursor-pointer transition-colors ${
        isActive ? "bg-parchment" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        <PageTag page={reference.sourceSelection.page} onClick={handlePageClick} />
      </div>
      <FadeTruncate
        text={reference.sourceSelection.text}
        maxLines={2}
        expandable
        className="text-xs text-ink-secondary leading-relaxed"
        fadeTo={isActive ? "var(--bg-primary)" : undefined}
      />
      <div className="flex items-center justify-between mt-1 text-[10px] text-ink-tertiary">
        <span className="capitalize">{relLabel}</span>
        <div className="flex items-center gap-1.5">
          <span>{type?.name ?? ""}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
