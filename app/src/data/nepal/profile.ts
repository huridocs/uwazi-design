// The Nepal record in depth: every template property the entity holds, in
// template order, as the record and the edit form read it. The corpus is
// English (23 of 789 sources are in Nepali; their quotes stay verbatim), so the
// four reading languages share one field list.
import type { Language } from "../../atoms/language";
import type { AnyMetadataField } from "../metadata";
import type { EntityProfile, MediaItemView } from "../entityProfiles";
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
import type { NepalDoc, NepalEntity } from "./types";
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
    const mediaItem = e.template === "nepal_media" ? mediaItemOf(e) : undefined;
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

/* ── Media items ─────────────────────────────────────────────────────── */

const first = (e: NepalEntity, prop: string) => e.metadata[prop]?.[0];
const str = (e: NepalEntity, prop: string) => {
  const v = first(e, prop)?.value;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};
const num = (e: NepalEntity, prop: string) => {
  const v = first(e, prop)?.value;
  return typeof v === "number" ? v : undefined;
};
const linkOf = (e: NepalEntity, prop: string) => {
  const v = first(e, prop)?.value as { url?: string; label?: string } | undefined;
  return v?.url ? { url: v.url, label: v.label || v.url } : undefined;
};
const selectOf = (e: NepalEntity, prop: string) => {
  const v = first(e, prop);
  return typeof v?.value === "string" ? { value: v.value, label: v.label ?? v.value } : undefined;
};

/** The properties the card draws. The rest stay in the field list. */
const MEDIA_COVERS = [
  "file",
  "embed",
  "page_url",
  "attribution",
  "licence",
  "licence_url",
  "segment_start",
  "segment_end",
  "content_warning",
  "file_size_bytes",
];

function mediaItemOf(e: NepalEntity): MediaItemView {
  const kind = (str(e, "media_kind") ?? "photo") as MediaItemView["kind"];
  const warning = selectOf(e, "content_warning");
  const verification = selectOf(e, "verification");
  const start = num(e, "segment_start");
  const end = num(e, "segment_end");
  const image = e.image
    ? (() => {
        const { url, width, height } = e.image!;
        const r = width / height;
        return {
          url: asset(url),
          width,
          height,
          aspect: (Math.abs(r - 1) <= 0.05 ? "square" : r > 1 ? "landscape" : "portrait") as "square" | "landscape" | "portrait",
          alt: str(e, "caption") ?? e.title,
          filename: url.slice(url.lastIndexOf("/") + 1),
          fieldKey: "file",
          ...(str(e, "attribution") ? { credit: str(e, "attribution") } : {}),
        };
      })()
    : undefined;
  return {
    kind,
    ...(image ? { image } : {}),
    ...(str(e, "embed") ? { embed: str(e, "embed") } : {}),
    ...(start !== undefined ? { segment: { start, ...(end !== undefined && end > start ? { end } : {}) } } : {}),
    ...(num(e, "duration_seconds") ? { duration: num(e, "duration_seconds") } : {}),
    ...(linkOf(e, "page_url") ? { page: linkOf(e, "page_url") } : {}),
    ...(first(e, "platform")?.label ? { platform: first(e, "platform")!.label } : {}),
    ...(str(e, "attribution") ? { attribution: str(e, "attribution") } : {}),
    ...(str(e, "licence") ? { licence: str(e, "licence") } : {}),
    ...(linkOf(e, "licence_url") ? { licenceUrl: linkOf(e, "licence_url")!.url } : {}),
    ...(warning && (warning.value === "graphic" || warning.value === "distressing")
      ? { contentWarning: warning as MediaItemView["contentWarning"] }
      : {}),
    ...(verification ? { verification } : {}),
    ...(str(e, "verified_by") ? { verifiedBy: str(e, "verified_by") } : {}),
    factChecks: verification?.value === "misattributed" ? factChecksOf(e.sharedId) : [],
    covers: MEDIA_COVERS,
  };
}

/** The fact-checking sources that report on or dispute an item, oldest
 *  first: the record names them where it says the item is misattributed. */
function factChecksOf(id: string): MediaItemView["factChecks"] {
  const found: { date: number; check: MediaItemView["factChecks"][number] }[] = [];
  const seen = new Set<string>();
  for (const r of nepalRefsByEntity().get(id) ?? []) {
    if (r.to !== id || seen.has(r.from)) continue;
    const src = nepalEntity(r.from);
    if (src?.template !== "nepal_source" || src.metadata.publisher_type?.[0]?.value !== "fact-check") continue;
    seen.add(r.from);
    const url = (src.metadata.url?.[0]?.value as { url?: string } | undefined)?.url;
    const publisher = src.metadata.publisher?.[0]?.value;
    found.push({
      date: src.date ?? 0,
      check: {
        entityId: src.sharedId,
        publisher: typeof publisher === "string" ? publisher : src.title,
        title: src.title,
        ...(url ? { url } : {}),
      },
    });
  }
  return found.sort((a, b) => a.date - b.date).map((f) => f.check);
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
