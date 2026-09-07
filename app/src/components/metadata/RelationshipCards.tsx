import { useAtomValue } from "jotai";
import type { Language } from "../../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import type { EntityProfile } from "../../data/entityProfiles";
import type { RelationshipMetadataField } from "../../data/metadata";
import { groupConnections, specInherits } from "../../utils/inheritance";
import { ConnectionGroupCard } from "./ConnectionGroupCard";
import { RelationshipFieldCard } from "./RelationshipFieldCard";
import { spanClass, type CardSpan } from "./cardSpan";
import { MasonryItem } from "./MasonryGrid";

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

  /* Every one of these spans the record's full width, and it is the tables that
     decide it: a connection table folds to one card per connected entity below
     28.5rem of its own container (see tableBreakpoint.ts), and a masonry column
     is ~345px. Left in a column they would ALL fold, permanently, on a record
     with room for three columns — the responsive behaviour firing because of
     the layout rather than because of the width available. Full width keeps the
     table while the record can carry one, and the section reads as the band it
     already was. */
  return (
    <>
      <MasonryItem full>
        <div className={`${spanClass("full")} mt-2 flex items-center`}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
            Relationships
          </h3>
        </div>
      </MasonryItem>
      {groups.map((group) => (
        <MasonryItem key={group.connectionKey} full>
          <ConnectionGroupCard group={group} />
        </MasonryItem>
      ))}
      {singles.map((field) => (
        <MasonryItem key={field.id} full>
          <RelationshipFieldCard field={field} span={span} />
        </MasonryItem>
      ))}
    </>
  );
}
