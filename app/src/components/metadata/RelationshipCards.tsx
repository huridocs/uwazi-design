import { useAtomValue } from "jotai";
import type { Language } from "../../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import type { EntityProfile } from "../../data/entityProfiles";
import type { RelationshipMetadataField } from "../../data/metadata";
import { groupConnections, specInherits } from "../../utils/inheritance";
import { ConnectionGroupCard } from "./ConnectionGroupCard";
import { RelationshipFieldCard } from "./RelationshipFieldCard";
import { spanClass, type CardSpan } from "./cardSpan";

/** The "Relationships" section of an entity's metadata: shared connections
 *  (multi-inheritance) as grouped tables + standalone relationship fields as
 *  single cards. Extracted so the main Metadata read view AND the drawers render
 *  the same relationship/inherited properties from the same source — they can't
 *  drift apart. Returns null when the entity has no relationship fields.
 *
 *  `span` sets the single-field card width: "wide" for the main 3-col grid,
 *  "full" for a single-column drawer. */
export function RelationshipCards({
  profile,
  language,
  span = "wide",
  inheritingOnly = false,
}: {
  profile: EntityProfile;
  language: Language;
  span?: CardSpan;
  /** Skip link-only connections — the host renders them in the fields record
   *  instead (see `connectionItem`). A card is for a connection that carries a
   *  TABLE; one that only points at an entity is a property, not a section. */
  inheritingOnly?: boolean;
}) {
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const relFields = (profile.metadata[language] ?? []).filter(
    (f): f is RelationshipMetadataField => f.type === "relationship",
  );
  const { groups, singles: allSingles } = groupConnections(relFields, language, getProp);
  const singles = inheritingOnly ? allSingles.filter(specInherits) : allSingles;
  if (groups.length === 0 && singles.length === 0) return null;

  return (
    <>
      <div className={`${spanClass("full")} mt-2 flex items-center`}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
          Relationships
        </h3>
      </div>
      {groups.map((group) => (
        <ConnectionGroupCard key={group.connectionKey} group={group} />
      ))}
      {singles.map((field) => (
        <RelationshipFieldCard key={field.id} field={field} span={span} />
      ))}
    </>
  );
}
