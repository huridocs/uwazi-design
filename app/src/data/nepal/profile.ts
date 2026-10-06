// The Nepal record in depth: every template property the entity holds, in
// template order, as the record and the edit form read it. The corpus is
// English (23 of 789 sources are in Nepali; their quotes stay verbatim), so the
// four reading languages share one field list.
import type { Language } from "../../atoms/language";
import type { AnyMetadataField } from "../metadata";
import type { EntityProfile } from "../entityProfiles";
import type { Reference } from "../references";
import { registerEntityPropReader } from "../entityMetadata";
import { registerEvidenceProvider } from "../fieldEvidence";
import { recordFieldsFor, type RecordContext } from "../../utils/templateProjection";
import { templateMirror } from "../templates/mirror";
import { nepalRelTypeName, nepalTemplateById } from "./schema";
import { loadNepalEvidence, nepalEvidence, nepalEntity, nepalPrimaryDoc, nepalProfileParts, nepalRefsByEntity } from "./load";
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
  const metadata = LANGS.reduce((acc, l) => ((acc[l] = fields), acc), {} as Record<Language, AnyMetadataField[]>);
  // The document and media halves load with the corpus (profileParts.ts):
  // only this collection needs them, so the app bundle does not carry them.
  const parts = nepalProfileParts();
  const doc = nepalPrimaryDoc(id);
  // Most records are web pages or have no document: the record links them
  // (`url`), it holds no file.
  if (!doc || !parts) {
    const mediaItem = e.template === "nepal_media" ? parts?.mediaItemOf(e) : undefined;
    return {
      id,
      typeId: e.template,
      hasDocument: false,
      metadata,
      documentGroups: [],
      files: [],
      ...(mediaItem ? { mediaItem } : {}),
      relationships: { kind: "references" },
    };
  }
  return {
    id,
    typeId: e.template,
    hasDocument: true,
    metadata,
    ...parts.documentParts(e, doc),
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

registerEvidenceProvider({
  covers: (id) => !!nepalEntity(id),
  rows: nepalEvidence,
  load: loadNepalEvidence,
});

const refCache = new Map<string, Reference[]>();

/** This record's references — both directions — as the Relationships tab's
 *  rows. A source's quote is the text anchor. A web article has no pages, so
 *  its quote sits on page 0 and the row shows no page tag. A quote located in
 *  a bundled PDF keeps its page, when that PDF is the one this record shows,
 *  so the page tag jumps to it. Read-only. */
export function nepalReferencesFor(id: string): Reference[] {
  const hit = refCache.get(id);
  if (hit) return hit;
  const shown = nepalEntity(id)?.docs?.[0];
  const pageOf = (r: { file?: string; page?: number }) => (r.file && r.file === shown && r.page ? r.page : 0);
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
      ...(r.quote ? { sourceSelection: { text: r.quote, page: pageOf(r), top: 0, left: 0, width: 0, height: 0 } } : {}),
      verification: r.verification,
      ...(r.date ? { period: r.date } : {}),
      createdAt: "",
    };
  });
  refCache.set(id, out);
  return out;
}
