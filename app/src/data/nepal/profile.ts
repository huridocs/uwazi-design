// The Nepal record in depth: every template property the entity holds, in
// template order, as the record and the edit form read it. The corpus is
// English (23 of 789 sources are in Nepali; their quotes stay verbatim), so the
// four reading languages share one field list.
import type { Language } from "../../atoms/language";
import type { AnyMetadataField } from "../metadata";
import type { EntityProfile } from "../entityProfiles";
import type { Reference } from "../references";
import { registerEntityPropReader } from "../entityMetadata";
import { recordFieldsFor, type RecordContext } from "../../utils/templateProjection";
import { templateMirror } from "../templates/mirror";
import { nepalRelTypeName, nepalTemplateById } from "./schema";
import { nepalEntity, nepalRefsByEntity } from "./load";
import { displayValues } from "./adapt";

export { isNepalEntity } from "./load";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

const ctx: RecordContext = {
  corpus: "nepal",
  relationTypeName: (id) => nepalRelTypeName.get(id ?? "") ?? "",
  template: (id) => templateMirror("nepal", id),
};

export function buildNepalProfile(id: string): EntityProfile {
  const e = nepalEntity(id)!;
  const fields = recordFieldsFor(templateMirror("nepal", e.template), e.metadata, ctx);
  return {
    id,
    typeId: e.template,
    // Sources are web pages: the record links them (`url`), it holds no file.
    hasDocument: false,
    metadata: LANGS.reduce((acc, l) => ((acc[l] = fields), acc), {} as Record<Language, AnyMetadataField[]>),
    documentGroups: [],
    files: [],
    relationships: { kind: "references" },
  };
}

/** An inherited column's value: one native property of a Nepal record, as
 *  display text (see the Travesía profile). */
registerEntityPropReader((entityId, propName) => {
  const e = nepalEntity(entityId);
  if (!e) return undefined;
  const p = nepalTemplateById.get(e.template)?.properties.find((x) => x.name === propName);
  if (!p) return undefined;
  const values = displayValues(p, e);
  return values.length ? values.join(", ") : undefined;
});

const refCache = new Map<string, Reference[]>();

/** This record's references — both directions — as the Relationships tab's
 *  rows. A source's quote is the text anchor, on page 0: a web article has no
 *  pages, so the row shows the quote and no page tag. Read-only. */
export function nepalReferencesFor(id: string): Reference[] {
  const hit = refCache.get(id);
  if (hit) return hit;
  const out = (nepalRefsByEntity().get(id) ?? []).map((r): Reference => {
    const outgoing = r.from === id;
    return {
      id: `np-${r.id}`,
      sourceEntityId: id,
      targetEntityId: outgoing ? r.to : r.from,
      // The dump name: `relationLabel` resolves it through the registry, so a
      // rename in Settings reaches it.
      relationType: nepalRelTypeName.get(r.type) ?? r.type,
      direction: outgoing ? "outgoing" : "incoming",
      ...(r.quote ? { sourceSelection: { text: r.quote, page: 0, top: 0, left: 0, width: 0, height: 0 } } : {}),
      createdAt: "",
    };
  });
  refCache.set(id, out);
  return out;
}
