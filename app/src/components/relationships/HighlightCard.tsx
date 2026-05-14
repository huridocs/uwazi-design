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
    <div className="border-l-2 border-highlight-active bg-highlight/20 rounded-r-lg px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
        {selection && <PageTag page={selection.page} />}
      </div>
      {selection ? (
        <FadeTruncate
          text={selection.text}
          maxLines={4}
          expandable
          className="text-xs text-ink-secondary leading-relaxed italic"
          fadeTo="color-mix(in srgb, var(--highlight-yellow) 20%, var(--bg-surface))"
        />
      ) : (
        <p className="text-xs italic text-ink-tertiary">
          Entity-level connection
        </p>
      )}
    </div>
  );
}
