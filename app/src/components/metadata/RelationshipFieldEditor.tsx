import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { X, Plus, Search, PenLine, Link2, Info } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { entitiesAtom } from "../../atoms/entities";
import { getEntityType } from "../../data/entities";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { overlayEntityIdAtom } from "../../atoms/references";
import { EntityPill } from "../shared/EntityPill";
import { InheritedValueTag, MissingValue } from "./InheritedValueChip";
import { resolveInheritedValue, type ConnectionColumn } from "../../utils/inheritance";

/**
 * Edits ONE connection. The connection (`entityIds`) is the editable part;
 * inherited values are read-only previews. Because sibling fields share a
 * connection, editing here updates them all at once (multi-inheritance sync is
 * the parent's job — it owns one `entityIds` array per connection key).
 */
export function RelationshipFieldEditor({
  title,
  relationLabel,
  targetTypeId,
  columns,
  entityIds,
  onChange,
}: {
  title: string;
  relationLabel: string;
  targetTypeId: string;
  columns: ConnectionColumn[];
  entityIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const lang = useAtomValue(languageAtom);
  const allEntities = useAtomValue(entitiesAtom);
  const getEntityProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const setOverlay = useSetAtom(overlayEntityIdAtom);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const entityHeader = getEntityType(targetTypeId)?.name ?? "Entity";

  const candidates = allEntities.filter(
    (e) => e.typeId === targetTypeId && !entityIds.includes(e.id) && e.title.toLowerCase().includes(query.toLowerCase()),
  );

  const add = (id: string) => {
    onChange([...entityIds, id]);
    setQuery("");
    setAdding(false);
  };
  const remove = (id: string) => onChange(entityIds.filter((x) => x !== id));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Link2 size={14} className="text-carbon" />
        <label className="text-sm font-bold text-ink">{title}</label>
        <span className="text-[11px] text-ink-tertiary">
          via <span className="text-carbon font-medium">{relationLabel}</span>
        </span>
      </div>

      {/* Connected entities — the editable part, as the same bordered table the
          read view uses (entity + inherited value columns), plus per-row edit
          actions (Source / Remove). */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-ink-tertiary">
                <th className="py-1.5 px-3 text-start font-medium">{entityHeader}</th>
                {columns.map((c) => (
                  <th key={c.fieldId} className="py-1.5 px-3 text-start font-medium whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Link2 size={10} className="text-carbon" />
                      {c.label}
                    </span>
                  </th>
                ))}
                <th className="w-0 px-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {entityIds.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="px-3 py-2.5 text-xs text-ink-muted border-t border-border/40"
                  >
                    No connected entities yet.
                  </td>
                </tr>
              ) : (
                entityIds.map((id) => {
                  const entity = allEntities.find((e) => e.id === id);
                  return (
                    <tr key={id} className="border-t border-border/40 hover:bg-warm/30 transition-colors">
                      <td className="py-1.5 px-3 align-middle">
                        <button
                          onClick={() => setOverlay(id)}
                          title="Preview source entity"
                          className="rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <EntityPill typeId={entity?.typeId ?? targetTypeId} label={entity?.title ?? "Unknown entity"} />
                        </button>
                      </td>
                      {columns.map((c) => {
                        const v = resolveInheritedValue(id, c, lang, getEntityProp);
                        return (
                          <td
                            key={c.fieldId}
                            className="py-1.5 px-3 align-middle whitespace-nowrap border-s border-border/40"
                          >
                            {v ? (
                              <InheritedValueTag value={v} propLabel={c.label} relationLabel={relationLabel} hideGlyph />
                            ) : (
                              <MissingValue propLabel={c.label} />
                            )}
                          </td>
                        );
                      })}
                      <td className="py-1 px-2 align-middle border-s border-border/40">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => setOverlay(id)}
                            title="Edit at source"
                            className="flex items-center gap-1 px-1.5 h-6 text-[11px] font-medium text-ink-secondary rounded hover:bg-warm transition-colors cursor-pointer"
                          >
                            <PenLine size={12} /> Source
                          </button>
                          <button
                            onClick={() => remove(id)}
                            title="Remove from connection"
                            className="flex items-center justify-center w-6 h-6 rounded text-ink-muted hover:bg-warm hover:text-seal transition-colors cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add an entity to the connection */}
      {adding ? (
        <div className="border border-border rounded-md overflow-hidden">
          <div className="relative">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entities…"
              className="w-full h-8 pl-3 pr-8 text-xs font-medium bg-paper border-b border-border
                placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20"
            />
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          </div>
          <div className="max-h-[180px] overflow-auto">
            {candidates.length === 0 ? (
              <div className="px-3 py-2 text-xs text-ink-muted">No matching entities.</div>
            ) : (
              candidates.map((e) => (
                <button
                  key={e.id}
                  onClick={() => add(e.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-start hover:bg-warm transition-colors"
                >
                  <EntityPill typeId={e.typeId} label={e.title} />
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors"
        >
          <Plus size={13} /> Add entity
        </button>
      )}

      {columns.length > 0 && (
        <p className="flex items-start gap-1.5 text-[11px] text-ink-tertiary">
          <Info size={12} className="text-carbon shrink-0 mt-px" />
          Inherited values are read-only. Change the connection above, or edit the source entity.
        </p>
      )}
    </div>
  );
}
