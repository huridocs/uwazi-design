import { Fragment } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { overlayEntityIdAtom } from "../../atoms/references";
import { MetadataCard } from "./MetadataCard";
import { spanClass, type CardSpan } from "./cardSpan";
import { InheritedValueTag, MissingValue, ProvenanceTrail, RelationCaption, RollupChip } from "./InheritedValueChip";
import { EntityPill } from "../shared/EntityPill";
import { reduceInherited, resolveRelationshipField, specInherits } from "../../utils/inheritance";
import type { RelationshipMetadataField } from "../../data/metadata";

/** A standalone relationship field (no shared connection). Two shapes:
 *  - inherits a property → a 2-column grid (entity · inherited value) so values
 *    line up in a column, matching the tabular grouped card.
 *  - link-only → a compact wrapping list of entity pills.
 *  Resolves against the live entity-metadata atom so edit-at-source cascades here. */
export function RelationshipFieldCard({ field, span = "wide" }: { field: RelationshipMetadataField; span?: CardSpan }) {
  const lang = useAtomValue(languageAtom);
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const setOverlay = useSetAtom(overlayEntityIdAtom);
  const resolved = resolveRelationshipField(field, lang, getProp);
  const inherits = specInherits(field);
  const rollup = reduceInherited(resolved.values.map((v) => v.inheritedValue), field.reduce);

  // When every value shares the SAME provenance (e.g. all judges signed one
  // Sentencia), hoist that trail to a single shared line rather than repeating it
  // on every row — the repetition was pure noise. Per-row trails only when they
  // actually differ.
  const provSig = (v: (typeof resolved.values)[number]) => (v.provenance ?? []).map((s) => s.entityId).join(">");
  const sigs = resolved.values.map(provSig);
  const sharedProvenance =
    inherits && resolved.values.length > 1 && sigs[0] !== "" && sigs.every((s) => s === sigs[0])
      ? resolved.values[0].provenance
      : undefined;

  const pill = (v: (typeof resolved.values)[number]) => (
    <button
      key={v.entityId}
      onClick={() => setOverlay(v.entityId)}
      className="justify-self-start min-w-0 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
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
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <RelationCaption relationLabel={resolved.relationLabel} inheritLabel={field.inheritLabel} />
          {sharedProvenance && (
            <div className="mt-0.5">
              <ProvenanceTrail steps={sharedProvenance} sharedLabel="all inherited" />
            </div>
          )}
        </div>
        {rollup && <RollupChip summary={rollup} />}
      </div>
      {inherits ? (
        <div
          className={`mt-1 grid grid-cols-[auto_1fr] gap-x-3 ${
            sharedProvenance ? "gap-y-1.5 items-center" : "gap-y-2 items-start"
          }`}
        >
          {resolved.values.map((v) => (
            <Fragment key={v.entityId}>
              <div className={sharedProvenance ? "" : "pt-0.5"}>{pill(v)}</div>
              <div className="min-w-0 flex flex-col gap-0.5">
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
                {!sharedProvenance && v.provenance && <ProvenanceTrail steps={v.provenance} />}
              </div>
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">{resolved.values.map((v) => pill(v))}</div>
      )}
      {field.totalConnected != null && field.totalConnected > resolved.values.length && (
        <p className="text-[11px] text-ink-tertiary mt-0.5">
          showing {resolved.values.length} of {field.totalConnected}
        </p>
      )}
    </MetadataCard>
  );
}
