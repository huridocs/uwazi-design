import { useAtomValue } from "jotai";
import { Link2 } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { MetadataCard } from "./MetadataCard";
import { InheritedValueChip, RelationCaption } from "./InheritedValueChip";
import { resolveRelationshipField } from "../../utils/inheritance";
import type { RelationshipMetadataField } from "../../data/metadata";

/** A standalone relationship field (no shared connection): the field's
 *  connected entities, each with its inherited value (or just the entity for a
 *  link-only relationship). */
export function RelationshipFieldCard({ field }: { field: RelationshipMetadataField }) {
  const lang = useAtomValue(languageAtom);
  const resolved = resolveRelationshipField(field, lang);
  const inherits = !!field.inheritProperty;

  return (
    <MetadataCard
      title={field.label}
      icon={<Link2 size={14} className="text-carbon" />}
      className="col-span-1 md:col-span-2"
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
