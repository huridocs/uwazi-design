import { useAtomValue, useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { overlayEntityIdAtom } from "../../atoms/references";
import { MetadataCard } from "./MetadataCard";
import { spanClass, type CardSpan } from "./cardSpan";
import { InheritedValueTag, MissingValue, ProvenanceTrail, RelationCaption, RollupChip } from "./InheritedValueChip";
import { EntityPill } from "../shared/EntityPill";
import { getEntityType } from "../../data/entities";
import { reduceInherited, resolveRelationshipField, specInherits } from "../../utils/inheritance";
import type { RelationshipMetadataField } from "../../data/metadata";

/** A standalone relationship field (no shared connection). Two shapes:
 *  - inherits a value → a compact bordered table (entity · inherited value), same
 *    styling as the multi-inheritance grouped card, so the columns are tied by
 *    rules instead of floating apart. Shared provenance is hoisted to one line and
 *    the reduce rollup sits in the value-column header.
 *  - link-only → a compact wrapping list of entity pills.
 *  Resolves against the live entity-metadata atom so edit-at-source cascades here. */
export function RelationshipFieldCard({ field, span = "wide" }: { field: RelationshipMetadataField; span?: CardSpan }) {
  const lang = useAtomValue(languageAtom);
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const setOverlay = useSetAtom(overlayEntityIdAtom);
  const resolved = resolveRelationshipField(field, lang, getProp);
  const inherits = specInherits(field);
  const rollup = reduceInherited(resolved.values.map((v) => v.inheritedValue), field.reduce);
  const entityHeader = field.entityLabel ?? getEntityType(resolved.values[0]?.entityTypeId)?.name ?? "Entity";

  // When every value shares the SAME provenance (e.g. all judges signed one
  // Sentencia), hoist that trail to a single shared line rather than repeating it
  // on every row. Per-row trails only when they actually differ.
  const provSig = (v: (typeof resolved.values)[number]) => (v.provenance ?? []).map((s) => s.entityId).join(">");
  const sigs = resolved.values.map(provSig);
  const sharedProvenance =
    inherits && resolved.values.length > 1 && sigs[0] !== "" && sigs.every((s) => s === sigs[0])
      ? resolved.values[0].provenance
      : undefined;

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
      icon={<Link2 size={14} className="text-carbon" />}
      className={spanClass(span)}
    >
      <RelationCaption relationLabel={resolved.relationLabel} inheritLabel={field.inheritLabel} />
      {sharedProvenance && (
        <div className="mt-0.5">
          <ProvenanceTrail steps={sharedProvenance} sharedLabel="all inherited" />
        </div>
      )}

      {inherits ? (
        <div className="overflow-x-auto -mx-1 mt-1.5">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-ink-tertiary">
                <th className="py-1.5 px-1 text-start font-medium">{entityHeader}</th>
                <th className="py-1.5 px-3 text-start font-medium align-top">
                  <span className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-1">
                      <Link2 size={10} className="text-carbon" />
                      {field.inheritLabel}
                    </span>
                    {rollup && <RollupChip summary={rollup} />}
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
                    {!sharedProvenance && v.provenance && (
                      <div className="mt-0.5 normal-case">
                        <ProvenanceTrail steps={v.provenance} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-1">{resolved.values.map((v) => entityCell(v))}</div>
      )}

      {field.totalConnected != null && field.totalConnected > resolved.values.length && (
        <p className="text-[11px] text-ink-tertiary mt-1">
          showing {resolved.values.length} of {field.totalConnected}
        </p>
      )}
    </MetadataCard>
  );
}
