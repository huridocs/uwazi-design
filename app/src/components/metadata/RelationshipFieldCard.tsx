import { useAtomValue } from "jotai";
import { Link2 } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { MetadataCard } from "./MetadataCard";
import { spanClass, type CardSpan } from "./cardSpan";
import { InheritedValueChip, RelationCaption } from "./InheritedValueChip";
import { resolveRelationshipField } from "../../utils/inheritance";
import type { RelationshipMetadataField } from "../../data/metadata";

/** A standalone relationship field (no shared connection): the field's
 *  connected entities, each with its inherited value (or just the entity for a
 *  link-only relationship). Resolves against the live entity-metadata atom so
 *  edit-at-source cascades here. */
export function RelationshipFieldCard({ field, span = "wide" }: { field: RelationshipMetadataField; span?: CardSpan }) {
  const lang = useAtomValue(languageAtom);
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const resolved = resolveRelationshipField(field, lang, getProp);
  const inherits = !!field.inheritProperty;

  return (
    <MetadataCard
      title={field.label}
      icon={<Link2 size={14} className="text-carbon" />}
      className={spanClass(span)}
    >
      <RelationCaption relationLabel={resolved.relationLabel} inheritLabel={field.inheritLabel} />
      <div className="flex flex-col gap-1.5">
        {resolved.values.map((v) => (
          <InheritedValueChip key={v.entityId} value={v} inherits={inherits} relationLabel={resolved.relationLabel} />
        ))}
      </div>
    </MetadataCard>
  );
}
