import { useSetAtom } from "jotai";
import { overlayEntityIdAtom } from "../../atoms/references";
import { EntityPill } from "../shared/EntityPill";
import { InheritedValueTag, MissingValue, ProvenanceTrail, RollupChip } from "./InheritedValueChip";
import type { ProvenanceStep } from "../../utils/inheritance";

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
    provenance?: ProvenanceStep[];
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
 *  repeats every value it holds.
 *
 *  The rollups move up to one header line. They summarise the whole column, so
 *  they belong to the set, not to any card in it — and repeating "2 distinct" on
 *  each of six cards would say something false. */
export function ConnectionCardStack({
  entities,
  relationLabel,
  rollups,
  sharedProvenance,
}: {
  entities: StackEntity[];
  relationLabel: string;
  /** Per-column summaries, in column order. Nulls are skipped. */
  rollups?: { label: string; summary: { text: string; title: string } | null }[];
  /** True when every row's provenance is identical and hoisted by the caller —
   *  the cards then leave their own trails off, as the table does. */
  sharedProvenance?: boolean;
}) {
  const setOverlay = useSetAtom(overlayEntityIdAtom);
  const chips = (rollups ?? []).filter((r) => r.summary);

  return (
    <div className="mt-1.5 space-y-1.5">
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((r) => (
            <span key={r.label} className="inline-flex items-center gap-1">
              <span className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
                {r.label}
              </span>
              <RollupChip summary={r.summary!} />
            </span>
          ))}
        </div>
      )}

      {entities.map((e) => (
        <div key={e.entityId} className="rounded-md border border-border/40 p-2.5 space-y-1.5">
          <button
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
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-baseline">
              {e.cells.map((c) => (
                <div key={c.key} className="contents">
                  <span className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
                    {c.label}
                  </span>
                  <span className="min-w-0">
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
                    {!sharedProvenance && c.provenance && (
                      <span className="block mt-0.5 normal-case">
                        <ProvenanceTrail steps={c.provenance} />
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
