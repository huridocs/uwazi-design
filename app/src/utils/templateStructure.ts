import type { Language } from "../atoms/language";
import type { EntityProfile } from "../data/entityProfiles";
import type { AnyMetadataField, RelationshipMetadataField } from "../data/metadata";

/** The template's declared structure: which group a property belongs to, and in
 *  what order.
 *
 *  ONE derivation, because there are now two surfaces that must agree about it.
 *  The Template tab draws this structure; the metadata RECORD has to be laid out
 *  in it. When the record did its own thing — bucketing fields by kind so every
 *  short scalar came first — Description was the Body group's first property and
 *  landed in the middle of the record, and the dates and names arrived in an
 *  order the template never declared. A reader who checks the Template tab to
 *  learn the shape of an entity and then reads a record laid out differently has
 *  been told two things.
 *
 *  So: the template decides ORDER and GROUPING. Field kind decides a card's
 *  SHAPE — how many columns it spans, whether it is chips or prose — and never
 *  its position. */

export type TemplateGroupId = "header" | "body" | "inherited";

/** A Header property. These are not record VALUES: Title is the entity's own
 *  title (the record's identity header renders it), and Document / Document
 *  metadata belong to the Document and Files tabs — the document left this view
 *  deliberately. The Template tab lists them because it describes the template;
 *  the record has nothing of its own to draw for them. */
export interface HeaderProperty {
  name: string;
  type: string;
  required: boolean;
}

export interface TemplateStructure {
  header: HeaderProperty[];
  /** Direct properties, in the template's own order — scalars and link-only
   *  relationships interleaved exactly as declared. */
  body: AnyMetadataField[];
  /** Relationship fields that inherit a value. Their own group in the Template
   *  tab, and the record's Relationships section below the body. */
  inherited: RelationshipMetadataField[];
}

/** Whether a relationship field inherits — the test the Template tab has always
 *  used, kept here so the two cannot drift. */
export function fieldInherits(f: RelationshipMetadataField): boolean {
  return !!(f.inheritProperty || f.inheritPath?.length || f.inheritLeaf);
}

export function deriveTemplateStructure(
  profile: EntityProfile,
  language: Language,
): TemplateStructure {
  const header: HeaderProperty[] = [
    { name: "Title", type: "text", required: true },
    ...(profile.hasDocument
      ? [
          { name: "Document", type: "media", required: true },
          { name: "Document metadata", type: "generated", required: true },
        ]
      : []),
  ];
  const body: AnyMetadataField[] = [];
  const inherited: RelationshipMetadataField[] = [];
  for (const f of profile.metadata[language] ?? []) {
    if (f.type === "relationship" && fieldInherits(f)) inherited.push(f);
    else body.push(f);
  }
  return { header, body, inherited };
}
