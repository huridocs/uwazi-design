import { useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { overlayEntityIdAtom } from "../../atoms/references";
import { MetadataCard } from "./MetadataCard";
import { spanClass, type CardSpan } from "./cardSpan";
import { RelationCaption, InheritedValueTag, MissingValue, RollupChip } from "./InheritedValueChip";
import { EntityPill } from "../shared/EntityPill";
import { getEntityType } from "../../data/entities";
import { mergeConnectionRows, reduceInherited, type ConnectionGroup } from "../../utils/inheritance";
import { ConnectionCardStack, type StackEntity } from "./ConnectionCardStack";
import { TABLE_MIN } from "./tableBreakpoint";

/** Multi-inheritance, Section-2 "Option 1": several relationship fields sharing
 *  one connection rendered as a single table. Rows are sorted by the inherited
 *  columns and repeated values are MERGED (cell-spanned), so shared values group
 *  their entities together. The inherited columns lead; the connected entity
 *  (leaf) is the last column. */
export function ConnectionGroupCard({ group, span = "full" }: { group: ConnectionGroup; span?: CardSpan }) {
  const setOverlay = useSetAtom(overlayEntityIdAtom);
  const entityHeader = getEntityType(group.targetTypeId)?.name ?? "Entity";
  const rows = mergeConnectionRows(group);
  // Per-column rollups computed over the UNMERGED values (one per connected entity).
  const summaries = group.columns.map((c, i) =>
    reduceInherited(group.rows.map((r) => r.cells[i]?.value), c.reduce),
  );
  /* The narrow rendering reads `group.rows` — the UNMERGED ones. `rows` above
     is the cell-spanned view, where a value lives on the first entity that has
     it and the rest inherit it positionally; flattened into cards that would
     leave every entity after the first with blank cells. */
  const stackEntities: StackEntity[] = group.rows.map((r) => ({
    entityId: r.entityId,
    entityTypeId: r.entityTypeId,
    entityTitle: r.entityTitle,
    cells: group.columns.map((c, i) => ({
      key: c.fieldId,
      label: c.label,
      value: r.cells[i]?.value,
    })),
  }));

  return (
    <MetadataCard
      title={group.label}
      icon={<Link2 size={14} className="text-carbon" />}
      className={spanClass(span)}
    >
      <RelationCaption
        relationLabel={group.relationLabel}
        inheritLabels={group.columns.map((c) => c.label)}
      />

      {/* Container query, not a viewport breakpoint: this same card renders in
          the main Metadata view, the Library drawer preview and the entity
          overlay, so what decides the layout is how wide THE CARD is, not how
          wide the window is. */}
      <div className={`-mx-1 ${TABLE_MIN.container}`}>
      <div className={TABLE_MIN.tableOnly}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
              {group.columns.map((c, i) => (
                <th key={c.fieldId} className="py-1.5 px-3 text-start whitespace-nowrap align-top">
                  <span className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-1">
                      <Link2 size={10} className="text-carbon" />
                      {c.label}
                    </span>
                    {summaries[i] && <RollupChip summary={summaries[i]!} />}
                  </span>
                </th>
              ))}
              <th className="py-1.5 px-1 text-start">{entityHeader}</th>
            </tr>
          </thead>
          <tbody>
            {/* Horizontal dividers live on each LEADING cell, not the row — so a
                new top-level value (a country) rules a line across every column,
                a new sub-value (a role) rules Role+Person only, and each person
                gets a hairline under Person. The dividers "step" with the merge,
                so a spanned group reads as one block instead of a flat grid.
                Spanning labels are vertically centred against their group. */}
            {rows.map((row) => (
              <tr key={row.entityId} className="hover:bg-warm/30 transition-colors">
                {row.cells.map((cell, i) =>
                  cell.lead ? (
                    <td
                      key={cell.fieldId}
                      rowSpan={cell.rowSpan}
                      className="py-1.5 px-3 whitespace-nowrap align-middle border-t border-s border-border/40 first:border-s-0"
                    >
                      {cell.value ? (
                        <InheritedValueTag
                          value={cell.value}
                          propLabel={group.columns[i]?.label}
                          relationLabel={group.relationLabel}
                          hideGlyph
                        />
                      ) : (
                        <MissingValue propLabel={group.columns[i]?.label} />
                      )}
                    </td>
                  ) : null,
                )}
                <td className="py-1.5 px-1 align-middle border-t border-s border-border/40">
                  <button
                    onClick={() => setOverlay(row.entityId)}
                    className="rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                    title="Preview source entity"
                  >
                    <EntityPill typeId={row.entityTypeId} label={row.entityTitle} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Below the threshold: one card per connected entity, merges expanded. */}
      <div className={TABLE_MIN.stackOnly}>
        <ConnectionCardStack
          entities={stackEntities}
          relationLabel={group.relationLabel}
          rollups={group.columns.map((c, i) => ({ label: c.label, summary: summaries[i] ?? null }))}
        />
      </div>
      </div>
    </MetadataCard>
  );
}
