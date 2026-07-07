import { useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import { getEntityProfile } from "../../data/entityProfiles";
import type { MetadataField } from "../../data/metadata";
import { MetadataFieldsTable, isLongField } from "./MetadataFieldsTable";
import { MetadataCard } from "./MetadataCard";
import { RelationshipCards } from "./RelationshipCards";

/** The condensed metadata body shared by EVERY drawer/preview context (library
 *  preview drawer, entity-view metadata drawer). It reads the SAME focused-entity
 *  profile the main Metadata view uses — one source of truth — so the metadata a
 *  user sees is identical across surfaces; they're the same view in different
 *  contexts and can't drift. Renders scalar native fields as a bordered table +
 *  the relationship/inherited cards. */
export function EntityMetadataSummary({ entityId }: { entityId: string }) {
  const language = useAtomValue(languageAtom);
  const profile = getEntityProfile(entityId);
  const all = profile.metadata[language] ?? [];
  const scalar = all.filter((f): f is MetadataField => f.type !== "relationship");
  const hasRel = all.some((f) => f.type === "relationship");
  const hasScalar = scalar.some((f) => !!f.value?.trim());

  if (!hasScalar && !hasRel) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center">
        <p className="text-xs text-ink-muted">No metadata for this entity yet.</p>
      </div>
    );
  }

  // Card-wrap the scalar block so it reads like the relationship cards below:
  // each long-form field is its own titled card; the short label|value rows
  // share one "Details" card.
  const filled = scalar.filter((f) => !!f.value?.trim());
  const longFields = filled.filter(isLongField);
  const shortFields = filled.filter((f) => !isLongField(f));

  return (
    <div className="h-full overflow-auto p-4 space-y-3">
      {longFields.map((f) => (
        <MetadataCard key={f.id} title={f.label}>
          <p className="text-sm text-ink leading-snug">{f.value}</p>
        </MetadataCard>
      ))}
      {shortFields.length > 0 && (
        <MetadataCard title="Details">
          <MetadataFieldsTable fields={shortFields} />
        </MetadataCard>
      )}
      <RelationshipCards profile={profile} language={language} span="full" />
    </div>
  );
}
