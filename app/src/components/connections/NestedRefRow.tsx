import { useAtom, useSetAtom } from "jotai";
import {
  activeRefIdAtom,
  scrollToHighlightAtom,
} from "../../atoms/references";
import { currentPageAtom } from "../../atoms/selection";
import { getEntity, getEntityType } from "../../data/entities";
import { Reference, relationTypes } from "../../data/references";

interface Props {
  reference: Reference;
  /** Show the relation-type label inline. Use it when the surrounding context
   *  (entity overlay, mixed-type drawer) doesn't already establish it.
   *  Skip it inside an aggregate's inline-expand — the aggregate header
   *  carries the relation type already. */
  showRelLabel?: boolean;
}

/** Compact reference row used when the surrounding context already
 *  establishes the target entity (aggregate inline-expand, EntityOverlay
 *  references list, etc.). Shows a small template colour dot, the snippet,
 *  optionally the relation label, and a page tag on the right. */
export function NestedRefRow({ reference, showRelLabel = false }: Props) {
  const entity = getEntity(reference.targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const [activeRefId, setActiveRefId] = useAtom(activeRefIdAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const selection = reference.sourceSelection;
  const isActive = activeRefId === reference.id;
  const relLabel =
    relationTypes.find((r) => r.id === reference.relationType)?.label ??
    reference.relationType.replace("_", " ");

  const handleClick = () => {
    setActiveRefId(reference.id);
    if (selection) {
      setCurrentPage(selection.page);
      setScrollToHighlight(reference.id);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group w-full text-left px-3 py-2 flex items-start gap-2 border-b border-border/40 last:border-b-0 transition-colors ${
        isActive ? "bg-parchment" : "hover:bg-warm/60"
      }`}
    >
      <span
        className="w-2 h-2 rounded-[2px] shrink-0 mt-1.5"
        style={{ backgroundColor: type?.color ?? "var(--border-primary)" }}
        aria-hidden="true"
      />
      <span className="flex-1 min-w-0 text-xs text-ink-secondary leading-relaxed">
        {selection ? (
          <span className="italic">"{selection.text}"</span>
        ) : (
          <span className="italic text-ink-tertiary">
            Entity-level connection — no text anchor
          </span>
        )}
        {showRelLabel && (
          <span className="block mt-1 text-[10px] text-ink-tertiary capitalize not-italic">
            {relLabel}
          </span>
        )}
      </span>
      {selection && (
        <span className="shrink-0 text-[10px] font-mono tabular-nums text-ink-tertiary mt-0.5">
          p.{selection.page}
        </span>
      )}
    </button>
  );
}
