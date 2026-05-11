import { FileText, ArrowRight, ArrowLeft } from "lucide-react";
import { useAtom, useSetAtom } from "jotai";
import { Relationship } from "../../utils/relationships";
import { getEntity, getEntityType } from "../../data/entities";
import { relationTypes } from "../../data/references";
import { EntityPill } from "../shared/EntityPill";
import { ListCardRow } from "../shared/ListCardRow";
import {
  overlayEntityIdAtom,
  activeDrawerTabAtom,
} from "../../atoms/references";
import { activeClusterRefIdsAtom } from "../../atoms/filters";

interface RelationshipRowProps {
  relationship: Relationship;
}

export function RelationshipRow({ relationship }: RelationshipRowProps) {
  const entity = getEntity(relationship.targetEntityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
  const [overlayEntityId, setOverlayEntityId] = useAtom(overlayEntityIdAtom);
  const setActiveDrawerTab = useSetAtom(activeDrawerTabAtom);
  const setActiveClusterRefIds = useSetAtom(activeClusterRefIdsAtom);

  const relLabel =
    relationTypes.find((r) => r.id === relationship.relationType)?.label ??
    relationship.relationType.replace("_", " ");

  const selected = overlayEntityId === relationship.targetEntityId;

  const jumpToEvidence = () => {
    setActiveClusterRefIds(relationship.refIds);
    setActiveDrawerTab("references");
  };

  const openOverlay = () => setOverlayEntityId(relationship.targetEntityId);

  return (
    <ListCardRow selected={selected} onClick={openOverlay}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-ink-tertiary">{type?.name ?? ""}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              jumpToEvidence();
            }}
            aria-label={`${relationship.evidenceCount} evidence references`}
            title="Jump to evidence in References"
            className="flex items-center gap-1 px-1.5 h-5 rounded bg-warm hover:bg-parchment text-ink-tertiary hover:text-ink-secondary text-[10px] font-medium tabular-nums transition-colors cursor-pointer"
          >
            <FileText size={10} />
            {relationship.evidenceCount}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1 text-[10px] text-ink-tertiary">
        <DirectionGlyph direction={relationship.direction} />
        <span className="capitalize">{relLabel}</span>
      </div>
    </ListCardRow>
  );
}

function DirectionGlyph({ direction }: { direction: "outgoing" | "incoming" }) {
  const Icon = direction === "incoming" ? ArrowLeft : ArrowRight;
  const title = direction === "incoming" ? "Incoming" : "Outgoing";
  return (
    <span
      aria-label={title}
      title={title}
      className="inline-flex items-center justify-center w-3 h-3 rounded-[2px] bg-vellum text-ink-tertiary shrink-0"
    >
      <Icon size={9} strokeWidth={2.5} />
    </span>
  );
}
