import type { Language } from "../atoms/language";
import type { Entity } from "../data/entities";
import type { MetadataField } from "../data/metadata";
import type { DocumentGroup, FileEntry } from "../data/files";
import type { Corpus, EntityRecord } from "../data/entityChanges";
import { cejilDefaultTemplateId } from "../data/cejil/profile";
import { ARTWORK_TYPE_ID } from "../data/artworks/typesAdapter";
import { templateMirror } from "../data/templates/mirror";
import { blankFieldsFor, generatedId } from "./templateProjection";
import { travesiaDefaultTemplateId, travesiaTemplates } from "../data/travesia/schema";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

/** What a MetadataEditBody hands back on Save: every language's title and
 *  scalar fields, as the form held them. */
export interface EditResult {
  titles: Record<Language, string>;
  fieldsByLang: Record<Language, MetadataField[]>;
}

/** A template's fields, empty and in template order, per language — for the
 *  corpus the entity is being created in. Projected from the corpus's template
 *  (`atoms/templates.ts`, `utils/templateProjection.ts`): one schema for
 *  Create entity, Change template, bulk edit and batch entry in every corpus.
 *  Properties the form has no editor for yet (relationship, geolocation,
 *  image) are left out, as they always were. */
export function templateFields(typeId: string, corpus: Corpus): Record<Language, MetadataField[]> {
  const template = templateMirror(corpus, typeId);
  // A "Generated ID" property starts with a value, the same in every language.
  const ids = Object.fromEntries(
    (template?.properties ?? []).filter((p) => p.type === "generatedid").map((p) => [p.name, generatedId()]),
  );
  return Object.fromEntries(
    LANGS.map((l) => [l, blankFieldsFor(corpus, template, l).map((f) => (ids[f.id] ? { ...f, value: ids[f.id] } : f))]),
  ) as Record<Language, MetadataField[]>;
}

/** The template a corpus flags as its default, if it flags one — Create entity
 *  lists it first. CEJIL's and Travesía's dumps carry the flag. */
export function defaultTemplateId(corpus: Corpus): string | undefined {
  if (corpus === "travesia") return travesiaDefaultTemplateId;
  return corpus === "cejil" ? cejilDefaultTemplateId() : undefined;
}

/** The template an uploaded document gets. Uwazi gives an upload the template
 *  flagged `default`; the Sample corpus's is its Document type. The artworks
 *  corpus has no document template, so an upload there is an artwork carrying
 *  a PDF. */
export function uploadTemplateId(corpus: Corpus): string {
  if (corpus === "cejil") return cejilDefaultTemplateId() ?? "document";
  if (corpus === "artworks") return ARTWORK_TYPE_ID;
  // No document template in this schema: an upload takes the default one.
  if (corpus === "travesia") return travesiaDefaultTemplateId ?? travesiaTemplates[0]._id;
  return "document";
}

/** The attached file, as the record and the viewer read it. */
export interface AttachedFile {
  name: string;
  size: number;
  url: string;
}

const kb = (n: number) =>
  n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

/** A new entity's record: its template's fields (empty, or the values given),
 *  and — for an upload — the file as its one primary document. */
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
  const groupId = `${id}-g`;
  const groups: DocumentGroup[] = [
    { id: groupId, title: file.name.replace(/\.pdf$/i, ""), isPrimary: true, order: 0 },
  ];
  const files: FileEntry[] = [
    {
      id: `${id}-f`,
      groupId,
      name: file.name,
      language: "EN",
      type: "pdf",
      size: kb(file.size),
      modified: today(),
      url: file.url,
    },
  ];
  return { typeId, metadata: fieldsByLang, documentGroups: groups, files };
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
