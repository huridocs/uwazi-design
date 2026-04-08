import { Trash2, Eye } from "lucide-react";
import { Reference } from "../../data/references";
import { getEntity } from "../../data/entities";
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
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const [scrollToRef, setScrollToRef] = useAtom(scrollToRefAtom);
  const [activeRefId, setActiveRefId] = useAtom(activeRefIdAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const setOverlayEntityId = useSetAtom(overlayEntityIdAtom);
  const rowRef = useRef<HTMLDivElement>(null);

  const isActive = activeRefId === reference.id;

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
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      className={`group px-3 py-2.5 border-b border-border/50 cursor-pointer
        transition-all ${
          isActive
            ? "bg-highlight/25 border-l-2 border-l-highlight-active"
            : "hover:bg-warm"
        }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        <PageTag page={reference.sourceSelection.page} onClick={handlePageClick} />
      </div>
      <FadeTruncate
        text={reference.sourceSelection.text}
        maxLines={2}
        expandable
        className="text-xs text-ink-secondary leading-relaxed"
        fadeTo={isActive ? "color-mix(in srgb, var(--highlight-yellow) 25%, var(--bg-surface))" : undefined}
      />
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-ink-tertiary capitalize">
          {reference.relationType.replace("_", " ")}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOverlayEntityId(reference.targetEntityId);
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-warm
              text-ink-muted hover:text-ink transition-all"
          >
            <Eye size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(reference.id);
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-seal-tint
              text-ink-muted hover:text-seal transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
