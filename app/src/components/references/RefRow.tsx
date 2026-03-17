import { Trash2 } from "lucide-react";
import { Reference } from "../../data/references";
import { getEntity } from "../../data/entities";
import { EntityPill } from "../shared/EntityPill";
import { PageTag } from "../shared/PageTag";
import { useSetAtom, useAtom } from "jotai";
import { scrollToHighlightAtom, scrollToRefAtom, activeRefIdAtom } from "../../atoms/references";
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
      onClick={handleClick}
      className={`group px-3 py-2.5 border-b border-border/50 cursor-pointer
        transition-all ${
          isActive
            ? "bg-highlight/25 border-l-2 border-l-highlight-active"
            : "hover:bg-warm"
        }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <PageTag page={reference.sourceSelection.page} onClick={handlePageClick} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(reference.id);
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-seal-tint
              text-ink-muted hover:text-seal transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <p className="text-xs text-ink-secondary leading-relaxed line-clamp-2">
        "{reference.sourceSelection.text}"
      </p>
      <span className="text-[10px] text-ink-muted mt-1 inline-block capitalize">
        {reference.relationType.replace("_", " ")}
      </span>
    </div>
  );
}
