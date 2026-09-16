import { useId, useState } from "react";
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
  const titleId = useId();
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
    /* A group, named by its title. The title was a `<label>` with no control
       to label — it named nothing. */
    <div data-component="RelationshipFieldEditor" role="group" aria-labelledby={titleId} className="space-y-1.5">
      <div data-part="header" className="flex items-center gap-1.5">
        <Link2 size={14} className="text-carbon" aria-hidden />
        {/* The form-label recipe (`settings/Field.tsx`), not the card-title one
            this used to borrow — it names the connection editor's input, and a
            14px bold label made one field in the metadata form shout while its
            neighbours spoke. */}
        <span id={titleId} data-part="title" className="text-xs font-medium text-ink-secondary">{title}</span>
        <span data-part="relation" className="text-meta text-ink-tertiary">
          via <span className="text-carbon font-medium">{relationLabel}</span>
        </span>
      </div>

      {/* Connected entities — the editable part, as the same bordered table the
          read view uses (entity + inherited value columns), plus per-row edit
          actions (Source / Remove). */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table data-part="table" className="w-full text-sm border-collapse">
            <caption className="sr-only">{`${title}: connected entities`}</caption>
            <thead>
              <tr className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
                <th scope="col" data-part="column-header" className="py-1.5 px-3 text-start">{entityHeader}</th>
                {columns.map((c) => (
                  <th key={c.fieldId} scope="col" data-part="column-header" className="py-1.5 px-3 text-start whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Link2 size={10} className="text-carbon" aria-hidden />
                      {c.label}
                    </span>
                  </th>
                ))}
                <th scope="col" className="w-0 px-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {entityIds.length === 0 ? (
                <tr data-part="empty">
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
                    <tr key={id} data-part="row" className="border-t border-border/40 hover:bg-warm/30 transition-colors">
                      <td className="py-1.5 px-3 align-middle">
                        <button
                          type="button"
                          data-part="entity-open"
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
                            type="button"
                            data-part="source"
                            onClick={() => setOverlay(id)}
                            title="Edit at source"
                            className="flex items-center gap-1 px-1.5 h-6 text-meta font-medium text-ink-secondary rounded hover:bg-warm transition-colors cursor-pointer"
                          >
                            <PenLine size={12} /> Source
                          </button>
                          <button
                            type="button"
                            data-part="remove"
                            onClick={() => remove(id)}
                            title="Remove from connection"
                            aria-label={`Remove ${entity?.title ?? "entity"} from ${title}`}
                            className="flex items-center justify-center w-6 h-6 rounded text-ink-muted hover:bg-warm hover:text-seal-label transition-colors cursor-pointer"
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
        <div data-part="picker" className="border border-border rounded-md overflow-hidden">
          <div className="relative">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entities…"
              aria-label={`Search ${entityHeader} to add`}
              className="w-full h-8 pl-3 pr-8 text-xs font-medium bg-paper border-b border-border
                placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20"
            />
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          </div>
          <div className="max-h-[11.25rem] overflow-auto">
            {candidates.length === 0 ? (
              <div className="px-3 py-2 text-xs text-ink-muted">No matching entities.</div>
            ) : (
              candidates.map((e) => (
                <button
                  type="button"
                  key={e.id}
                  data-part="candidate"
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
          type="button"
          data-part="add"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors"
        >
          <Plus size={13} /> Add entity
        </button>
      )}

      {columns.length > 0 && (
        <p data-part="note" className="flex items-start gap-1.5 text-meta text-ink-tertiary">
          <Info size={12} className="text-carbon shrink-0 mt-px" aria-hidden />
          Inherited values are read-only. Change the connection above, or edit the source entity.
        </p>
      )}
    </div>
  );
}
