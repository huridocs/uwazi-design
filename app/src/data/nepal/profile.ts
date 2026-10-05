// The Nepal record in depth: every template property the entity holds, in
// template order, as the record and the edit form read it. The corpus is
// English (23 of 789 sources are in Nepali; their quotes stay verbatim), so the
// four reading languages share one field list.
import type { Language } from "../../atoms/language";
import type { AnyMetadataField } from "../metadata";
import type { EntityProfile } from "../entityProfiles";
import type { Reference } from "../references";
import type { DocumentMeta } from "../document";
import type { DocRendition, HtmlBlock } from "../documentRenditions";
import type { DocumentGroup, FileEntry } from "../files";
import { asset } from "../../utils/asset";
import { formatAtPrecision } from "../../utils/dateFormat";
import { registerEntityPropReader } from "../entityMetadata";
import { recordFieldsFor, type RecordContext } from "../../utils/templateProjection";
import { templateMirror } from "../templates/mirror";
import { nepalRelTypeName, nepalTemplateById } from "./schema";
import { nepalEntity, nepalPrimaryDoc, nepalRefsByEntity } from "./load";
import type { NepalDoc } from "./types";
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
  const doc = nepalPrimaryDoc(id);
  // Most records are web pages or have no document: the record links them
  // (`url`), it holds no file.
  if (!doc) {
    return { id, typeId: e.template, hasDocument: false, metadata, documentGroups: [], files: [], relationships: { kind: "references" } };
  }
  const byLang = <T,>(v: T) => LANGS.reduce((a, l) => ((a[l] = v), a), {} as Record<Language, T>);
  const { group, file } = nepalDocFile(doc);
  const meta: DocumentMeta = {
    id: `doc-${doc.id}`,
    title: doc.title,
    entityTypeId: e.template,
    language: LANGUAGE_NAME[doc.language] ?? doc.language,
    createdAt: "",
    pages: doc.pages,
    filename: `${doc.id}.pdf`,
  };
  return {
    id,
    typeId: e.template,
    hasDocument: true,
    metadata,
    document: byLang(meta),
    renditions: byLang(renditionOf(doc)),
    documentGroups: [group],
    files: [file],
    documentProvenance: {
      issuer: doc.publisher,
      sourceUrl: doc.sourceUrl,
      ...(doc.published ? { dateLine: `Published ${formatAtPrecision(new Date(doc.published * 1000), "day")}` } : {}),
      licenceBasis: doc.licenceBasis,
      textNote: "OCR, unreviewed",
    },
    relationships: { kind: "references" },
  };
}

const LANGUAGE_NAME: Record<string, string> = { ne: "Nepali", en: "English" };

const kb = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

/** A bundled PDF as the Files tab and the viewer read it: one primary group
 *  holding one file. The file id is what search passages and page jumps name. */
export function nepalDocFile(doc: NepalDoc): { group: DocumentGroup; file: FileEntry } {
  const groupId = `g-nepal-${doc.id}`;
  return {
    group: { id: groupId, title: doc.title, isPrimary: true, order: 0 },
    file: {
      id: nepalDocFileId(doc.id),
      groupId,
      name: `${doc.id}.pdf`,
      language: doc.language.toUpperCase(),
      type: "pdf",
      size: kb(doc.bytes),
      modified: "",
      url: asset(`/nepal-data/docs/${doc.id}.pdf`),
    },
  };
}

export const nepalDocFileId = (docId: string) => `np-doc-${docId}`;

/** The plain-text and HTML renditions: the OCR text, page by page, as read.
 *  The pages stay marked, because the OCR's line breaks are the scan's and a
 *  reader checking a quote needs the page it is on. */
function renditionOf(doc: NepalDoc): DocRendition {
  const blocks: HtmlBlock[] = [{ type: "h1", text: doc.title }];
  const plain: string[] = [];
  doc.text.forEach((page, i) => {
    blocks.push({ type: "section", text: `Page ${i + 1}` });
    plain.push(`— Page ${i + 1} —`);
    for (const chunk of page.split(/\n\s*\n/)) {
      const para = chunk.split(/\n/).map((l) => l.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      if (!para) continue;
      blocks.push({ type: "p", text: para });
      plain.push(para);
    }
  });
  return { plainText: plain.join("\n\n"), html: blocks };
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
      createdAt: "",
    };
  });
  refCache.set(id, out);
  return out;
}
