import { Reference } from "../../data/references";
import { getEntity } from "../../data/entities";
import { EntityPill } from "../shared/EntityPill";
import { PageTag } from "../shared/PageTag";

interface HighlightCardProps {
  reference: Reference;
}

export function HighlightCard({ reference }: HighlightCardProps) {
  const entity = getEntity(reference.targetEntityId);

  return (
    <div className="border-l-2 border-highlight-active bg-highlight/20 rounded-r-lg px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        <PageTag page={reference.sourceSelection.page} />
      </div>
      <p className="text-xs text-ink-secondary leading-relaxed italic">
        "{reference.sourceSelection.text}"
      </p>
    </div>
  );
}
