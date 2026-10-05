// The Nepal profile's document and media halves, loaded with the corpus
// (load.ts) rather than bundled: no other collection reads them.
import type { Language } from "../../atoms/language";
import type { DocumentProvenance, MediaItemView } from "../entityProfiles";
import type { DocumentMeta } from "../document";
import type { DocRendition, HtmlBlock } from "../documentRenditions";
import type { DocumentGroup, FileEntry } from "../files";
import { asset } from "../../utils/asset";
import { formatAtPrecision } from "../../utils/dateFormat";
import { nepalDocFileId, nepalEntity, nepalRefsByEntity } from "./load";
import type { NepalDoc, NepalEntity } from "./types";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

/** A record's document half: the PDF as a file in a primary group, its OCR
 *  text as the renditions, and where it came from. */
export function documentParts(e: NepalEntity, doc: NepalDoc) {
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
  const provenance: DocumentProvenance = {
    issuer: doc.publisher,
    sourceUrl: doc.sourceUrl,
    ...(doc.published ? { dateLine: `Published ${formatAtPrecision(new Date(doc.published * 1000), "day")}` } : {}),
    licenceBasis: doc.licenceBasis,
    textNote: "OCR, unreviewed",
  };
  return {
    document: byLang(meta),
    renditions: byLang(renditionOf(doc)),
    documentGroups: [group],
    files: [file],
    documentProvenance: provenance,
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

export function mediaItemOf(e: NepalEntity): MediaItemView {
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
