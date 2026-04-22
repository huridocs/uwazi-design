import { Eye, FileText } from "lucide-react";
import { useSetAtom } from "jotai";
import { Relationship } from "../../utils/relationships";
import { getEntity } from "../../data/entities";
import { relationTypes } from "../../data/references";
import { EntityPill } from "../shared/EntityPill";
import { overlayEntityIdAtom, activeDrawerTabAtom } from "../../atoms/references";
import { activeClusterRefIdsAtom } from "../../atoms/filters";

interface RelationshipRowProps {
  relationship: Relationship;
}

export function RelationshipRow({ relationship }: RelationshipRowProps) {
  const entity = getEntity(relationship.targetEntityId);
  const setOverlayEntityId = useSetAtom(overlayEntityIdAtom);
  const setActiveDrawerTab = useSetAtom(activeDrawerTabAtom);
  const setActiveClusterRefIds = useSetAtom(activeClusterRefIdsAtom);

  const relLabel =
    relationTypes.find((r) => r.id === relationship.relationType)?.label ??
    relationship.relationType.replace("_", " ");

  const jumpToEvidence = () => {
    setActiveClusterRefIds(relationship.refIds);
    setActiveDrawerTab("references");
  };

  const openOverlay = () => setOverlayEntityId(relationship.targetEntityId);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openOverlay}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openOverlay(); } }}
      className="group px-3 py-2 border-b border-border/50 cursor-pointer hover:bg-warm transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        <button
          onClick={(e) => { e.stopPropagation(); jumpToEvidence(); }}
          aria-label={`${relationship.evidenceCount} evidence references`}
          title="Jump to evidence in References"
          className="shrink-0 flex items-center gap-1 px-1.5 h-5 rounded bg-warm hover:bg-parchment text-ink-tertiary hover:text-ink-secondary text-[10px] font-medium tabular-nums transition-colors"
        >
          <FileText size={10} />
          {relationship.evidenceCount}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-ink-tertiary capitalize">{relLabel}</span>
        <button
          onClick={(e) => { e.stopPropagation(); openOverlay(); }}
          aria-label="Preview entity"
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-warm text-ink-muted hover:text-ink transition-all"
        >
          <Eye size={12} />
        </button>
      </div>
    </div>
  );
}
