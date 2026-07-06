import { Reference } from "../../data/references";
import { getEntity } from "../../data/entities";
import { EntityPill } from "../shared/EntityPill";
import { PageTag } from "../shared/PageTag";
import { FadeTruncate } from "../shared/FadeTruncate";

interface HighlightCardProps {
  reference: Reference;
}

export function HighlightCard({ reference }: HighlightCardProps) {
  const entity = getEntity(reference.targetEntityId);
  const selection = reference.sourceSelection;

  return (
    <div className="bg-highlight/20 rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        {selection && <PageTag page={selection.page} />}
      </div>
      {selection && (
        <FadeTruncate
          text={selection.text}
          maxLines={4}
          expandable
          className="text-xs text-ink-secondary leading-relaxed italic"
          fadeTo="color-mix(in srgb, var(--highlight-yellow) 20%, var(--bg-surface))"
        />
      )}
    </div>
  );
}
