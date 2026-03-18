import { Reference } from "../../data/references";
import { getEntity } from "../../data/entities";
import { EntityPill } from "../shared/EntityPill";

interface HoverExpandProps {
  reference: Reference;
  x: number;
  y: number;
}

export function HoverExpand({ reference, x, y }: HoverExpandProps) {
  const entity = getEntity(reference.targetEntityId);

  return (
    <div
      className="fixed z-40 animate-fade-in-up pointer-events-none"
      style={{ left: x + 8, top: y + 8 }}
    >
      <div className="bg-paper border border-border rounded-md shadow-lg px-3 py-2.5 max-w-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} size="sm" />
          <span className="text-[10px] text-ink-muted capitalize">
            {reference.relationType.replace("_", " ")}
          </span>
        </div>
        <p className="text-xs text-ink-secondary leading-relaxed line-clamp-3">
          "{reference.sourceSelection.text}"
        </p>
      </div>
    </div>
  );
}
