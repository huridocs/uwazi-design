import { useAtomValue, useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { overlayEntityIdAtom } from "../../atoms/references";
import { MetadataCard } from "./MetadataCard";
import { spanClass, type CardSpan } from "./cardSpan";
import { InheritedValueTag, MissingValue, RelationCaption } from "./InheritedValueChip";
import { EntityPill } from "../shared/EntityPill";
import { getEntityType } from "../../data/entities";
import { resolveRelationshipField, specInherits } from "../../utils/inheritance";
import type { RelationshipMetadataField } from "../../data/metadata";
import { ConnectionCardStack, type StackEntity } from "./ConnectionCardStack";
import { TABLE_MIN } from "./tableBreakpoint";

/** A standalone relationship field (no shared connection). Two shapes:
 *  - inherits a value → a compact bordered table (entity · inherited value), same
 *    styling as the multi-inheritance grouped card, so the columns are tied by
 *    rules instead of floating apart. Rows show the entity and its values; no provenance trail.
 *  - link-only → a compact wrapping list of entity pills.
 *  Resolves against the live entity-metadata atom so edit-at-source cascades here. */
export function RelationshipFieldCard({ field, span = "wide" }: { field: RelationshipMetadataField; span?: CardSpan }) {
  const lang = useAtomValue(languageAtom);
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const setOverlay = useSetAtom(overlayEntityIdAtom);
  const resolved = resolveRelationshipField(field, lang, getProp);
  const inherits = specInherits(field);
  const entityHeader = field.entityLabel ?? getEntityType(resolved.values[0]?.entityTypeId)?.name ?? "Entity";

  const stackEntities: StackEntity[] = resolved.values.map((v) => ({
    entityId: v.entityId,
    entityTypeId: v.entityTypeId,
    entityTitle: v.entityTitle,
    cells: [
      {
        key: "inherited",
        label: field.inheritLabel ?? "Inherited",
        value: v.inheritedValue,
        propLabel: v.sourcePropLabel,
      },
    ],
  }));

  const entityCell = (v: (typeof resolved.values)[number]) => (
    <button
      key={v.entityId}
      onClick={() => setOverlay(v.entityId)}
      className="min-w-0 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
      title="Preview source entity"
    >
      <EntityPill typeId={v.entityTypeId} label={v.entityTitle} />
    </button>
  );

  return (
    <MetadataCard
      title={field.label}
      className={spanClass(span)}
    >
      <RelationCaption relationLabel={resolved.relationLabel} />

      {inherits ? (
        // Container query, not a viewport breakpoint — see ConnectionGroupCard.
        <div className={`-mx-1 mt-1.5 ${TABLE_MIN.container}`}>
        <div className={TABLE_MIN.tableOnly}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-meta uppercase tracking-wider text-ink-tertiary">
                <th className="font-semibold py-1.5 px-1 text-start">{entityHeader}</th>
                <th className="font-semibold py-1.5 px-3 text-start align-top">
                  <span className="inline-flex items-center gap-1">
                    <Link2 size={10} className="text-carbon" />
                    {field.inheritLabel}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {resolved.values.map((v) => (
                <tr key={v.entityId} className="hover:bg-warm/30 transition-colors">
                  <td className="py-1.5 px-1 align-middle border-t border-border/40">{entityCell(v)}</td>
                  <td className="py-1.5 px-3 align-middle whitespace-nowrap border-t border-s border-border/40">
                    {v.inheritedValue ? (
                      <InheritedValueTag
                        value={v.inheritedValue}
                        propLabel={v.sourcePropLabel}
                        relationLabel={resolved.relationLabel}
                        hideGlyph
                      />
                    ) : (
                      <MissingValue propLabel={v.sourcePropLabel} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={TABLE_MIN.stackOnly}>
          <ConnectionCardStack
            entities={stackEntities}
            relationLabel={resolved.relationLabel}
          />
        </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-1">{resolved.values.map((v) => entityCell(v))}</div>
      )}

      {field.totalConnected != null && field.totalConnected > resolved.values.length && (
        <p className="text-meta text-ink-tertiary mt-1">
          showing {resolved.values.length} of {field.totalConnected}
        </p>
      )}
    </MetadataCard>
  );
}
