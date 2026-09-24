import type { Language } from "../atoms/language";
import type { Entity } from "../data/entities";
import { blankTypeFields, getEntityProfile } from "../data/entityProfiles";
import type { MetadataField } from "../data/metadata";
import type { DocumentGroup, FileEntry } from "../data/files";
import type { Corpus, EntityRecord } from "../data/entityOverlay";
import { cejilBlankFields, cejilDefaultTemplateId } from "../data/cejil/profile";
import { artworkLibraryEntities } from "../data/artworks/adapt";
import { ARTWORK_TYPE_ID } from "../data/artworks/typesAdapter";
import { travesiaBlankFields } from "../data/travesia/profile";
import { travesiaDefaultTemplateId, travesiaTemplates } from "../data/travesia/schema";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

/** What a MetadataEditBody hands back on Save: every language's title and
 *  scalar fields, as the form held them. */
export interface EditResult {
  titles: Record<Language, string>;
  fieldsByLang: Record<Language, MetadataField[]>;
}

/** A template's fields, empty and in template order, per language — for the
 *  corpus the entity is being created in. Each corpus keeps its template shape
 *  in a different place:
 *   - the Sample corpus in the mock type table (`blankTypeFields`);
 *   - CEJIL in its real templates (`cejilBlankFields`), one set for every
 *     language, since a template's properties don't change with the language;
 *   - Travesía in its imported templates (`travesiaBlankFields`), likewise;
 *   - artworks in no table at all, so the fields of an existing entity of the
 *     type are read and emptied — the same template, by construction. */
export function templateFields(typeId: string, corpus: Corpus): Record<Language, MetadataField[]> {
  if (corpus === "cejil" || corpus === "travesia") {
    const fields = corpus === "cejil" ? cejilBlankFields(typeId) : travesiaBlankFields(typeId);
    return Object.fromEntries(LANGS.map((l) => [l, fields.map((f) => ({ ...f }))])) as Record<
      Language,
      MetadataField[]
    >;
  }
  if (corpus === "artworks") {
    const peer = artworkLibraryEntities().find((e) => e.typeId === typeId);
    const profile = peer ? getEntityProfile(peer.id) : undefined;
    return Object.fromEntries(
      LANGS.map((l) => [
        l,
        (profile?.metadata[l] ?? [])
          .filter((f): f is MetadataField => f.type !== "relationship")
          .map((f) => ({ ...f, value: "" })),
      ]),
    ) as Record<Language, MetadataField[]>;
  }
  return blankTypeFields(typeId);
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
