import { Lock } from "lucide-react";
import type { Entity } from "../../data/entities";

const NOTE = "Restricted: only people it is shared with can see it";

/** A padlock on a restricted (unpublished) record's Library card and List
 *  row, as Uwazi v1 drew one on its cards (huridocs/uwazi issue 9974). Draws
 *  nothing for a published record. The Share modal's General access changes
 *  it. */
export function RestrictedMark({ entity }: { entity: Pick<Entity, "published"> }) {
  if (entity.published) return null;
  return (
    <span data-component="RestrictedMark" className="inline-flex items-center text-ink-tertiary" title={NOTE}>
      <Lock size={11} aria-hidden />
      <span className="sr-only">{NOTE}</span>
    </span>
  );
}
