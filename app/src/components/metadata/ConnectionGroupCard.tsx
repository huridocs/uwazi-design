import { useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { overlayEntityIdAtom } from "../../atoms/references";
import { MetadataCard } from "./MetadataCard";
import { EntityPill } from "../shared/EntityPill";
import type { ConnectionGroup } from "../../utils/inheritance";

/** Multi-inheritance: several relationship fields sharing one connection,
 *  rendered as a single table — connected entities listed once (rows), each
 *  inherited property a column. Avoids repeating the same entities per field. */
export function ConnectionGroupCard({ group }: { group: ConnectionGroup }) {
  const setOverlay = useSetAtom(overlayEntityIdAtom);

  return (
    <MetadataCard
      title={group.label}
      icon={<Link2 size={14} className="text-carbon" />}
      className="col-span-1 md:col-span-2 xl:col-span-3"
    >
      <p className="text-[11px] text-ink-tertiary -mt-1">
        via <span className="text-carbon font-medium">{group.relationLabel}</span> ·{" "}
        {group.columns.length} inherited {group.columns.length === 1 ? "property" : "properties"}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="py-1.5 pe-3 text-start" />
              {group.columns.map((c) => (
                <th
                  key={c.fieldId}
                  className="py-1.5 px-3 text-start text-xs font-normal text-ink-tertiary whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    <Link2 size={10} className="text-carbon" />
                    {c.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row) => (
              <tr key={row.entityId} className="border-t border-border/40">
                <td className="py-1.5 pe-3">
                  <button
                    onClick={() => setOverlay(row.entityId)}
                    className="rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                    title="Preview source entity"
                  >
                    <EntityPill typeId={row.entityTypeId} label={row.entityTitle} />
                  </button>
                </td>
                {row.cells.map((cell) => (
                  <td key={cell.fieldId} className="py-1.5 px-3 font-medium text-ink whitespace-nowrap">
                    {cell.value ?? (
                      <span className="text-ink-muted font-normal" title="No value on source">
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MetadataCard>
  );
}
