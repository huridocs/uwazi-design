import { Fragment } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { overlayEntityIdAtom } from "../../atoms/references";
import { MetadataCard } from "./MetadataCard";
import { spanClass, type CardSpan } from "./cardSpan";
import { InheritedValueTag, MissingValue, RelationCaption } from "./InheritedValueChip";
import { EntityPill } from "../shared/EntityPill";
import { resolveRelationshipField } from "../../utils/inheritance";
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
  const inherits = !!field.inheritProperty;

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
      <RelationCaption relationLabel={resolved.relationLabel} inheritLabel={field.inheritLabel} />
      {inherits ? (
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 items-center">
          {resolved.values.map((v) => (
            <Fragment key={v.entityId}>
              {pill(v)}
              {v.inheritedValue ? (
                <InheritedValueTag
                  value={v.inheritedValue}
                  propLabel={v.sourcePropLabel}
                  relationLabel={resolved.relationLabel}
                />
              ) : (
                <MissingValue propLabel={v.sourcePropLabel} />
              )}
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
