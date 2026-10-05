// The Travesía record in depth: every template property the entity holds, in
// template order, as the record and the edit form read it. The corpus is
// Spanish-only (as CEJIL's labels are), so the four reading languages share one
// field list rather than dressing a monolingual record as a translated one.
import type { Language } from "../../atoms/language";
import type { AnyMetadataField } from "../metadata";
import type { EntityProfile } from "../entityProfiles";
import type { Reference } from "../references";
import { registerEntityPropReader } from "../entityMetadata";
import { recordFieldsFor, type RecordContext } from "../../utils/templateProjection";
import { templateMirror } from "../templates/mirror";
import { travesiaRelTypeName, travesiaTemplateById } from "./schema";
import { travesiaEntity, travesiaRelsByEntity } from "./load";
import { displayValues, portraitOf } from "./adapt";

export { isTravesiaEntity } from "./load";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

/** What the record projection needs to know about Travesía: relationship
 *  types by their dump name (what references carry and `relationLabel`
 *  resolves), and its templates for a connection's target. */
const ctx: RecordContext = {
  corpus: "travesia",
  relationTypeName: (id) => travesiaRelTypeName.get(id ?? "") ?? "",
  template: (id) => templateMirror("travesia", id),
};

export function buildTravesiaProfile(id: string): EntityProfile {
  const e = travesiaEntity(id)!;
  // The template is the schema: every property in its order, typed as the
  // template types it (template-schema-spec.md §4.4, step M3).
  const fields = recordFieldsFor(templateMirror("travesia", e.template), e.metadata, ctx);
  const image = portraitOf(e);
  // The portrait as the entity's one file, as the artworks corpus does with its
  // paintings: the record draws a single picture through the Files tab, not as
  // a card of its own. Not a document — `hasDocument` stays false.
  const groupId = `g-trv-${id}`;
  return {
    id,
    typeId: e.template,
    hasDocument: false,
    ...(image ? { image, images: [image] } : {}),
    metadata: LANGS.reduce((acc, l) => ((acc[l] = fields), acc), {} as Record<Language, AnyMetadataField[]>),
    documentGroups: image ? [{ id: groupId, title: image.alt, isPrimary: true, order: 0 }] : [],
    files: image
      ? [
          {
            id: `f-trv-${id}`,
            groupId,
            name: image.filename ?? `${id}.svg`,
            language: "ES",
            type: "image",
            size: `${Math.max(1, Math.round(image.url.length / 1024))} KB`,
            // Taken at intake: the record's own creation day.
            modified: new Date(e.creationDate).toISOString().slice(0, 10),
            url: image.url,
          },
        ]
      : [],
    relationships: { kind: "references" },
  };
}

/** An inherited column's value: one native property of a Travesía entity, as
 *  display text. Registered with `getEntityProp`, which the inheritance
 *  resolver reads — the same property, the same words, the record shows. */
registerEntityPropReader((entityId, propName) => {
  const e = travesiaEntity(entityId);
  if (!e) return undefined;
  const p = travesiaTemplateById.get(e.template)?.properties.find((x) => x.name === propName);
  if (!p) return undefined;
  const values = displayValues(p, e.metadata[p.name]);
  return values.length ? values.join(", ") : undefined;
});

/** This entity's connections — both directions — as the Relationships tab's
 *  references. Read-only. */
export function travesiaReferencesFor(id: string): Reference[] {
  return (travesiaRelsByEntity().get(id) ?? []).map((r, i) => {
    const outgoing = r.from === id;
    return {
      id: `trv-${i}-${r.from}-${r.to}-${r.relationType}`,
      sourceEntityId: id,
      targetEntityId: outgoing ? r.to : r.from,
      relationType: r.typeName || "related",
      direction: outgoing ? ("outgoing" as const) : ("incoming" as const),
      createdAt: "",
    };
  });
}
