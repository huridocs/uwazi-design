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
      data-component="HoverExpand"
      className="fixed z-40 animate-fade-in-up pointer-events-none"
      style={{ left: x + 8, top: y + 8 }}
    >
      <article data-part="card" className="bg-paper border border-border rounded-md shadow-lg px-3 py-2.5 max-w-xs">
        <div data-part="header" className="flex items-center gap-2 mb-1.5">
          <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} size="sm" />
          <span data-part="relation-type" className="text-meta text-ink-muted capitalize">
            {reference.relationType.replace("_", " ")}
          </span>
        </div>
        {reference.sourceSelection && (
          <p data-part="snippet" className="text-xs text-ink-secondary leading-relaxed line-clamp-3">
            "{reference.sourceSelection.text}"
          </p>
        )}
      </article>
    </div>
  );
}
