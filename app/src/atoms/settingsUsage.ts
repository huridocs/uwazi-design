import { atom, type Getter } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Entity } from "../data/entities";
import { applyOverlay, type Corpus } from "../data/entityOverlay";
import type { AnyMetadataField, MetadataField, RelationshipMetadataField } from "../data/metadata";
import { cejilEsBySid } from "../data/cejil/load";
import { relationTypesCorpus } from "./relationTypes";
import { cejilLibraryEntities } from "../data/cejil/adapt";
import { artworkLibraryEntities } from "../data/artworks/adapt";
import { templatesAtom } from "./templates";
import { entityPropertyValues } from "../utils/propertyValues";
import { cejilStats, cejilUsageByRelationType } from "../data/cejil/aggregates";
import type { SettingsLanguage, ThesaurusValue } from "../data/settings";
import {
  boundProperties,
  groupUsage,
  languageUsage,
  propertyUsage,
  relationTypeUsage,
  schemaFromTemplates,
  thesaurusUsage,
  userUsage,
  valueUsage,
  type HeldValue,
  type ValueReader,
} from "../utils/settingsUsage";
import { cejilReadyAtom, dataSourceAtom, type DataSource } from "./dataSource";
import { entitiesAtom } from "./entities";
import { entityAccessAtom, libraryEntityOverlayAtom } from "./entityOverlay";
import { entityMetadataAtom } from "./entityMetadata";
import type { Language } from "./language";
import { referencesAtom } from "./references";
import { thesaurusBindingsAtom } from "./thesauri";
import { groupsAtom, signedInUserAtom, userDeleteBlock, usersAtom } from "./users";

/** Usage selectors for Settings, one per domain (pure logic in
 *  `utils/settingsUsage.ts`). Each answers for the corpus whose configuration
 *  the page shows, which is not always the Library's: Templates and
 *  Relationship types show CEJIL's configuration on CEJIL and the Sample's
 *  everywhere else; Thesauri show each corpus's own, with artworks showing the
 *  Sample's (`atoms/thesauri.ts`). Languages: entities with a version in a language. */
export const templatesCorpus = (source: DataSource): Corpus => (source === "cejil" ? "cejil" : "mock");

/** A corpus's template properties and template names, from the template
 *  store: what Settings › Templates last saved. */
const schemaAtom = atomFamily((corpus: Corpus) => atom((get) => schemaFromTemplates(get(templatesAtom(corpus)))));
const templateNamesAtom = atomFamily((corpus: Corpus) =>
  atom((get) => {
    const m = new Map(get(templatesAtom(corpus)).map((t) => [t.id, t.name]));
    return (id: string) => m.get(id) ?? id;
  }),
);
export const thesauriCorpus = (source: DataSource): Corpus => (source === "artworks" ? "mock" : source);

/** A corpus's entities with the session's changes. `null` while a lazy corpus
 *  has not loaded: counts are unknown, not zero. */
function entitiesOf(get: Getter, corpus: Corpus): Entity[] | null {
  const overlay = get(libraryEntityOverlayAtom);
  if (corpus === "cejil") return get(cejilReadyAtom) ? applyOverlay(overlay.cejil, cejilLibraryEntities()) : null;
  if (corpus === "artworks") return applyOverlay(overlay.artworks, artworkLibraryEntities());
  return applyOverlay(overlay.mock, get(entitiesAtom));
}

const byTemplate = atomFamily((corpus: Corpus) =>
  atom((get) => {
    const list = entitiesOf(get, corpus);
    if (!list) return null;
    const m = new Map<string, Entity[]>();
    for (const e of list) {
      const arr = m.get(e.typeId);
      if (arr) arr.push(e);
      else m.set(e.typeId, [e]);
    }
    return m;
  }),
);

/** A raw Uwazi metadata value list (CEJIL) as held values: the stored `value`
 *  is the id for a select (thesaurus value) and a relationship (entity), and
 *  anything non-empty counts, geolocation and media included. */
function heldFromRaw(list: { value: unknown; label?: string }[] | undefined): HeldValue[] {
  const out: HeldValue[] = [];
  for (const v of list ?? []) {
    if (v.value === null || v.value === undefined || v.value === "") continue;
    const id = typeof v.value === "string" ? v.value : undefined;
    out.push({ id, label: v.label ?? (typeof v.value === "object" ? JSON.stringify(v.value) : String(v.value)) });
  }
  return out;
}

/** An edited or created entity's record, as held values. */
function heldFromRecord(fields: AnyMetadataField[] | undefined, p: { name: string; label: string }): HeldValue[] | null {
  const f = fields?.find((x) => x.id === p.name);
  if (!f) return null;
  if (f.type === "relationship") return (f as RelationshipMetadataField).connectedEntityIds.map((id) => ({ id, label: id }));
  const m = f as MetadataField;
  const labels = m.values ?? (m.value ? [m.value] : []);
  return labels.filter((l) => l.trim() !== "").map((label, i) => ({ id: m.valueIds?.[i] || undefined, label }));
}

/** How each corpus reads an entity's values for a property: the session's
 *  record first (edit form, bulk edit, Copy From, Create), else the corpus's
 *  own record: CEJIL's raw metadata, the Sample's native props. */
const readerAtom = atomFamily((corpus: Corpus) =>
  atom<ValueReader>((get) => {
    const records = get(libraryEntityOverlayAtom)[corpus].records;
    const lang: Language = corpus === "mock" || corpus === "artworks" ? "EN" : "ES";
    const native = get(entityMetadataAtom).EN;
    const cejilReady = get(cejilReadyAtom);
    return (e, p) => {
      const rec = records[e.id];
      if (rec) {
        const held = heldFromRecord(rec.metadata[lang] ?? rec.metadata.EN, p);
        if (held) return held;
      }
      if (corpus === "cejil") return cejilReady ? heldFromRaw(cejilEsBySid().get(e.id)?.metadata[p.name]) : [];
      if (corpus === "artworks") return entityPropertyValues(e, p.name, "EN").map((label) => ({ label }));
      const v = native[e.id]?.[p.name];
      return v ? [{ label: v }] : [];
    };
  }),
);

/** Said instead of a count while a lazy corpus's entities are still loading:
 *  an unknown count must not read as zero. */
const PENDING = "Entity counts appear when the collection's records have loaded.";
const withPending = <T extends { lines: string[] }>(u: T, pending: boolean): T =>
  pending ? { ...u, lines: [...u.lines, PENDING] } : u;

/* ── Templates ─────────────────────────────────────────────────────────── */

/** A template property: entities holding a value, and templates that
 *  inherit it. Key: `[templateId, label, name]`. */
const propertyUsageFamily = atomFamily((key: string) => {
  const [templateId, label, name] = JSON.parse(key) as [string, string, string | null];
  const k = { templateId, label, name: name ?? undefined };
  return atom((get) => {
    const corpus = get(dataSourceAtom);
    const groups = get(byTemplate(corpus));
    return withPending(
      propertyUsage({
        templateId: k.templateId,
        prop: k,
        schema: get(schemaAtom(corpus)),
        entities: groups?.get(k.templateId) ?? [],
        read: get(readerAtom(corpus)),
        templateName: get(templateNamesAtom(corpus)),
      }),
      groups === null,
    );
  });
});
export const propertyUsageAtom = (k: { templateId: string; label: string; name?: string }) =>
  propertyUsageFamily(JSON.stringify([k.templateId, k.label, k.name ?? null]));

/* ── Thesauri ──────────────────────────────────────────────────────────── */

const boundAtom = atomFamily((thesaurusId: string) =>
  atom((get) => {
    const source = get(dataSourceAtom);
    const corpus = thesauriCorpus(source);
    return boundProperties(get(schemaAtom(corpus)), thesaurusId, get(thesaurusBindingsAtom(source)));
  }),
);

export const thesaurusUsageAtom = atomFamily((thesaurusId: string) =>
  atom((get) => {
    const corpus = thesauriCorpus(get(dataSourceAtom));
    const groups = get(byTemplate(corpus));
    return withPending(
      thesaurusUsage({
        properties: get(boundAtom(thesaurusId)),
        entitiesOf: (id) => groups?.get(id) ?? [],
        read: get(readerAtom(corpus)),
        templateName: get(templateNamesAtom(corpus)),
      }),
      groups === null,
    );
  }),
);

/** Entities holding one value of a thesaurus: a function of the value, read
 *  once per removal rather than a family per value. */
export const valueUsageAtom = atomFamily((thesaurusId: string) =>
  atom((get) => {
    const corpus = thesauriCorpus(get(dataSourceAtom));
    const groups = get(byTemplate(corpus));
    const read = get(readerAtom(corpus));
    const properties = get(boundAtom(thesaurusId));
    // null: the corpus has not loaded, so the count is unknown.
    return (value: ThesaurusValue): number | null =>
      groups === null ? null : valueUsage({ value, properties, entitiesOf: (id) => groups.get(id) ?? [], read });
  }),
);

/* ── Relationship types ────────────────────────────────────────────────── */

/** A relationship type's usage, by id: the references that name it (the
 *  Sample's live store; CEJIL's counts from the importer, its references
 *  being read-only) and the relationship fields in its templates. */
export const relationTypeUsageAtom = atomFamily((id: string) =>
  atom((get) => get(relationTypeUsageInAtom(`${relationTypesCorpus(get(dataSourceAtom))}|${id}`))),
);

/** The same, for a named collection (`corpus|id`): the Relationships panel
 *  asks about the Sample whatever the Library shows. */
export const relationTypeUsageInAtom = atomFamily((key: string) =>
  atom((get) => {
    const [corpus, id] = key.split("|") as [Corpus, string];
    const references =
      corpus === "mock"
        ? get(referencesAtom).filter((x) => x.relationType === id).length
        : (cejilUsageByRelationType[id] ?? 0);
    return relationTypeUsage({
      id,
      references,
      schema: get(schemaAtom(corpus)),
      templateName: get(templateNamesAtom(corpus)),
      writable: corpus === "mock",
    });
  }),
);

/* ── Users and groups ──────────────────────────────────────────────────── */

/** Entities shared with a user or group by name in the Share modal. */
const sharesOf = (access: Record<string, { id: string }[]>, memberId: string) =>
  Object.values(access).filter((list) => list.some((m) => m.id === memberId)).length;

export const groupUsageAtom = atomFamily((groupId: string) =>
  atom((get) => {
    const g = get(groupsAtom).find((x) => x.id === groupId);
    const users = get(usersAtom);
    const members = (g?.memberIds ?? []).map((id) => users.find((u) => u.id === id)?.username ?? id);
    return groupUsage({ members, shares: sharesOf(get(entityAccessAtom), groupId) });
  }),
);

export const userUsageAtom = atomFamily((userId: string) =>
  atom((get) => {
    const users = get(usersAtom);
    const u = users.find((x) => x.id === userId);
    const groups = get(groupsAtom)
      .filter((g) => u?.groupIds.includes(g.id))
      .map((g) => g.name);
    return userUsage({
      block: userDeleteBlock(users, get(signedInUserAtom)?.id, userId),
      groups,
      shares: sharesOf(get(entityAccessAtom), userId),
    });
  }),
);

/* ── Languages ─────────────────────────────────────────────────────────── */

/** Entities with a version in a language: in Uwazi every entity has one per
 *  installed language. The Sample keeps metadata in EN/ES/FR/AR; CEJIL's
 *  count is the importer's. */
const languageUsageFamily = atomFamily((key: string) => {
  const [lkey, isDefault, translationsCount] = JSON.parse(key) as [string, boolean, number];
  const l = { key: lkey, default: isDefault, translationsCount };
  return atom((get) => {
    const corpus = templatesCorpus(get(dataSourceAtom));
    const key = l.key.toUpperCase() as Language;
    const entities =
      corpus === "cejil" ? cejilStats.entities : Object.keys(get(entityMetadataAtom)[key] ?? {}).length;
    return languageUsage({ isDefault: l.default, entities, translated: l.translationsCount });
  });
});
export const languageUsageAtom = (l: Pick<SettingsLanguage, "key" | "default" | "translationsCount">) =>
  languageUsageFamily(JSON.stringify([l.key, l.default, l.translationsCount]));
