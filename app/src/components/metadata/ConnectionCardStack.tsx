import { useSetAtom } from "jotai";
import { EntityPill } from "../shared/EntityPill";
import { InheritedValueTag, MissingValue } from "./InheritedValue";
import { previewEntityIdAtom } from "../../atoms/entityPreview";

/** One connected entity, flattened — no merged cells, no shared rows. */
export interface StackEntity {
  entityId: string;
  entityTypeId: string;
  entityTitle: string;
  cells: {
    key: string;
    label: string;
    value?: string;
    /** The property this was inherited FROM, for the value's own tooltip. */
    propLabel?: string;
  }[];
}

/** The narrow rendering of a connection table: one card per connected ENTITY.
 *
 *  A table answers "which entities share this value" — that is what the merged
 *  cells are for, and it needs the columns side by side to answer it. Below the
 *  width where the columns fit, the table stops answering anything and starts
 *  being dragged sideways, one hidden column at a time, with the entity that
 *  owns the row scrolled off the edge. So below that width the question changes
 *  to the one a narrow column can actually answer — "what do we know about this
 *  entity" — and each entity becomes a self-contained card.
 *
 *  Which is why the MERGE IS EXPANDED here: a card that inherits its Country
 *  from the row three above it is exactly the failure the scroll had. Every card
 *  repeats every value it holds. */
export function ConnectionCardStack({
  entities,
  relationLabel,
}: {
  entities: StackEntity[];
  relationLabel: string;
}) {
  const setOverlay = useSetAtom(previewEntityIdAtom);
  return (
    <div data-component="ConnectionCardStack" className="mt-1.5 space-y-1.5">
      <ul data-part="entities" className="space-y-1.5">
      {entities.map((e) => (
        <li key={e.entityId} data-part="entity" className="rounded-md border border-border/40 p-2.5 space-y-1.5">
          <button
            type="button"
            data-part="entity-open"
            onClick={() => setOverlay(e.entityId)}
            className="max-w-full min-w-0 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
            title="Preview source entity"
          >
            <EntityPill typeId={e.entityTypeId} label={e.entityTitle} />
          </button>
          {e.cells.length > 0 && (
            // `auto_1fr`: the labels share one column so the values line up down
            // the card, and a long value wraps in its own column rather than
            // pushing the label out of the card the way a flex row would.
            <dl data-part="cells" className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-baseline">
              {e.cells.map((c) => (
                <div key={c.key} className="contents">
                  <dt className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
                    {c.label}
                  </dt>
                  <dd className="min-w-0">
                    {c.value ? (
                      <InheritedValueTag
                        value={c.value}
                        propLabel={c.propLabel ?? c.label}
                        relationLabel={relationLabel}
                        hideGlyph
                      />
                    ) : (
                      <MissingValue propLabel={c.propLabel ?? c.label} />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </li>
      ))}
      </ul>
    </div>
  );
}
