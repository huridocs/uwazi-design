import type { Language } from "../atoms/language";
import type { Entity } from "../data/entities";
import type { MetadataField } from "../data/metadata";
import type { DocumentGroup, FileEntry, FileKind } from "../data/files";
import type { Corpus, EntityRecord } from "../data/entityChanges";
import { ARTWORK_TYPE_ID } from "../data/artworks/typesAdapter";
import { templateMirror, templatesMirror } from "../data/templates/mirror";
import { blankFieldsFor, generatedId } from "./templateProjection";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

/** What a MetadataEditBody hands back on Save: every language's title and
 *  scalar fields, as the form held them. */
export interface EditResult {
  titles: Record<Language, string>;
  fieldsByLang: Record<Language, MetadataField[]>;
  /** A draft's files, held by the form and uploaded only after the entity
   *  is saved (`attachUploadsAtom`). */
  files?: DraftFile[];
}

/** A file chosen on a draft's form. `role` is the list it sits in: a
 *  document (a PDF; the first is the primary document) or a supporting
 *  file (any type). */
export interface DraftFile {
  key: string;
  file: File;
  handle?: FileSystemFileHandle;
  role: "document" | "supporting";
}

/** A template's fields, empty and in template order, per language — for the
 *  corpus the entity is being created in. Projected from the corpus's template
 *  (`atoms/templates.ts`, `utils/templateProjection.ts`): one schema for
 *  Create entity, Change template, bulk edit and batch entry in every corpus.
 *  Properties the form has no editor for yet (relationship, geolocation,
 *  image) are left out, as they always were. */
export function templateFields(
  typeId: string,
  corpus: Corpus,
  { newEntity = false }: { newEntity?: boolean } = {},
): Record<Language, MetadataField[]> {
  const template = templateMirror(corpus, typeId);
  // A "Generated ID" property starts with a value, the same in every language,
  // drawn once for each entity being created. Change template and bulk edit
  // read blank fields and must not hand an id to existing entities.
  const ids = newEntity
    ? Object.fromEntries(
        (template?.properties ?? []).filter((p) => p.type === "generatedid").map((p) => [p.name, generatedId()]),
      )
    : {};
  return Object.fromEntries(
    LANGS.map((l) => [l, blankFieldsFor(corpus, template, l).map((f) => (ids[f.id] ? { ...f, value: ids[f.id] } : f))]),
  ) as Record<Language, MetadataField[]>;
}

/** The template the corpus flags as its default (Settings › Templates' star,
 *  from the template store): Create entity lists it first. */
export function defaultTemplateId(corpus: Corpus): string | undefined {
  return templatesMirror(corpus).find((t) => t.isDefault)?.id;
}

/** The template an uploaded document gets. Uwazi gives an upload the template
 *  flagged `default`; the Sample's is its Document type. The artworks corpus
 *  has no document template, so an upload there is an artwork carrying a PDF. */
export function uploadTemplateId(corpus: Corpus): string {
  if (corpus === "artworks") return ARTWORK_TYPE_ID;
  return defaultTemplateId(corpus) ?? templatesMirror(corpus)[0]?.id ?? "document";
}

/** The attached file, as the record and the viewer read it. `url` is absent
 *  while an upload interrupted by a reload waits for its file to be chosen
 *  again. */
export interface AttachedFile {
  name: string;
  size: number;
  url?: string;
  /** Default `pdf`. */
  kind?: FileKind;
  /** Default true: the primary document. False lists it as the entity's
   *  first supporting file (an attachment). */
  primary?: boolean;
}

/** What an uploaded file is, by its extension or MIME type. Only a PDF is
 *  a document; everything else is attached as a supporting file. */
export function fileKindOf(name: string, type = ""): FileKind {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (type.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext)) return "audio";
  if (type.startsWith("video/") || ["mp4", "mov", "webm", "avi", "mkv", "m4v"].includes(ext)) return "video";
  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "tif", "tiff", "heic"].includes(ext)) return "image";
  return "document";
}

/** A filename without its extension: an upload's title. */
export const titleFromFilename = (name: string) => name.replace(/\.[^./]+$/, "") || name;

const kb = (n: number) =>
  n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

/** A new entity's record: its template's fields (empty, or the values given),
 *  and — for an upload — the file as its one primary document, or as its
 *  first supporting file. */
export function buildRecord({
  id,
  typeId,
  fieldsByLang,
  file,
}: {
  id: string;
  typeId: string;
  fieldsByLang: Record<Language, MetadataField[]>;
  file?: AttachedFile;
}): EntityRecord {
  if (!file) return { typeId, metadata: fieldsByLang };
  const { group, entry } = recordFileOf({ fileId: `${id}-f`, groupId: `${id}-g`, file, order: 0 });
  return { typeId, metadata: fieldsByLang, documentGroups: [group], files: [entry] };
}

/** One attached file as the record holds it: a document group of its own
 *  (primary for a document, supporting otherwise) and its one file. */
export function recordFileOf({
  fileId,
  groupId,
  file,
  order,
}: {
  fileId: string;
  groupId: string;
  file: AttachedFile;
  order: number;
}): { group: DocumentGroup; entry: FileEntry } {
  return {
    group: { id: groupId, title: titleFromFilename(file.name), isPrimary: file.primary !== false, order },
    entry: {
      id: fileId,
      groupId,
      name: file.name,
      language: "EN",
      type: file.kind ?? "pdf",
      size: kb(file.size),
      modified: today(),
      url: file.url,
    },
  };
}

/** The label/value pairs an ADAPTER entity's card and search index read
 *  (`Entity.fields` / `searchFields`). Sample entities read their profile
 *  instead, so they don't get these. Only fields with a value, as the adapters
 *  emit them. */
export function adapterFieldsOf(fields: MetadataField[]): NonNullable<Entity["fields"]> {
  return fields
    .filter((f) => f.value && f.value.trim())
    .map((f) => ({ key: f.id, label: f.label, value: f.value }));
}

/** Today, in the ISO date form the corpora's `createdAt` uses. */
export const today = () => new Date().toISOString().slice(0, 10);
