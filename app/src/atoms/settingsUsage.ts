import { atom, type Getter } from "jotai";
import { atomFamily } from "jotai/utils";
import { entityTypes, type Entity } from "../data/entities";
import { applyOverlay, type Corpus } from "../data/entityChanges";
import type { AnyMetadataField, MetadataField, RelationshipMetadataField } from "../data/metadata";
import { cejilEsBySid } from "../data/cejil/load";
import { travesiaEntity } from "../data/travesia/load";
import { cejilLibraryEntities } from "../data/cejil/adapt";
import { travesiaLibraryEntities } from "../data/travesia/adapt";
import { cejilSettingsTemplates } from "../data/cejil/settingsAdapt";
import { travesiaTemplates } from "../data/travesia/schema";
import { cejilStats, cejilUsageByRelationType } from "../data/cejil/aggregates";
import type { SettingsLanguage, ThesaurusValue } from "../data/settings";
import {
  boundProperties,
  groupUsage,
  languageUsage,
  propertyUsage,
  relationTypeUsage,
  schemaOf,
  templateUsage,
  thesaurusUsage,
  userUsage,
  valueUsage,
  type HeldValue,
  type ValueReader,
} from "../utils/settingsUsage";
import { cejilReadyAtom, dataSourceAtom, travesiaReadyAtom, type DataSource } from "./dataSource";
import { entitiesAtom } from "./entities";
import { entityAccessAtom, libraryEntityOverlayAtom } from "./entityChanges";
import { entityMetadataAtom } from "./entityMetadata";
import type { Language } from "./language";
import { referencesAtom } from "./references";
import { thesaurusBindingsAtom } from "./thesauri";
import { groupsAtom, signedInUserAtom, userDeleteBlock, usersAtom } from "./users";

/** Usage selectors for Settings, one per domain. Each answers for the corpus
 *  whose configuration the page shows, which is not always the Library's:
 *  Templates, Relationship types and Languages show CEJIL's configuration on
 *  CEJIL and the Sample's everywhere else; Thesauri show each corpus's own,
 *  with artworks showing the Sample's (`atoms/thesauri.ts`). */
export const templatesCorpus = (source: DataSource): Corpus => (source === "cejil" ? "cejil" : "mock");
export const thesauriCorpus = (source: DataSource): Corpus => (source === "artworks" ? "mock" : source);

/** A corpus's entities with the session's changes. `null` while a lazy corpus
 *  has not loaded: counts are unknown, not zero. Artworks reads as the Sample
 *  (its Settings are the Sample's). */
function entitiesOf(get: Getter, corpus: Corpus): Entity[] | null {
  const overlay = get(libraryEntityOverlayAtom);
  if (corpus === "cejil") return get(cejilReadyAtom) ? applyOverlay(overlay.cejil, cejilLibraryEntities()) : null;
  if (corpus === "travesia")
    return get(travesiaReadyAtom) ? applyOverlay(overlay.travesia, travesiaLibraryEntities()) : null;
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

/** A raw Uwazi metadata value list (CEJIL, Travesía) as held values: the
 *  stored `value` is the id for a select (thesaurus value) and a relationship
 *  (entity), and anything non-empty counts, geolocation and media included. */
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
 *  own record: CEJIL's and Travesía's raw metadata, the Sample's native
 *  props. */
const readerAtom = atomFamily((corpus: Corpus) =>
  atom<ValueReader>((get) => {
    const records = get(libraryEntityOverlayAtom)[corpus === "artworks" ? "mock" : corpus].records;
    const lang: Language = corpus === "mock" || corpus === "artworks" ? "EN" : "ES";
    const native = get(entityMetadataAtom).EN;
    const cejilReady = get(cejilReadyAtom);
    const travesiaReady = get(travesiaReadyAtom);
    return (e, p) => {
      const rec = records[e.id];
      if (rec) {
        const held = heldFromRecord(rec.metadata[lang] ?? rec.metadata.EN, p);
        if (held) return held;
      }
      if (corpus === "cejil") return cejilReady ? heldFromRaw(cejilEsBySid().get(e.id)?.metadata[p.name]) : [];
      if (corpus === "travesia") return travesiaReady ? heldFromRaw(travesiaEntity(e.id)?.metadata[p.name]) : [];
      const v = native[e.id]?.[p.name];
      return v ? [{ label: v }] : [];
    };
  }),
);

function templateNameOf(corpus: Corpus): (id: string) => string {
  if (corpus === "cejil") {
    const m = new Map(cejilSettingsTemplates.map((t) => [t.id, t.name]));
    return (id) => m.get(id) ?? id;
  }
  if (corpus === "travesia") {
    const m = new Map(travesiaTemplates.map((t) => [t._id, t.name]));
    return (id) => m.get(id) ?? id;
  }
  const m = new Map(entityTypes.map((t) => [t.id, t.name]));
  return (id) => m.get(id) ?? id;
}

/* ── Templates ─────────────────────────────────────────────────────────── */

/** Entities using a template: live where the corpus is loaded, otherwise the
 *  count the importer baked in (`entityCount`). */
export const templateUsageAtom = atomFamily(
  (t: { id: string; isDefault: boolean; entityCount: number }) =>
    atom((get) => {
      const corpus = templatesCorpus(get(dataSourceAtom));
      const live = get(byTemplate(corpus));
      return templateUsage({
        templateId: t.id,
        isDefault: t.isDefault,
        entities: live ? (live.get(t.id)?.length ?? 0) : t.entityCount,
        schema: schemaOf(corpus),
        templateName: templateNameOf(corpus),
      });
    }),
  (a, b) => a.id === b.id && a.isDefault === b.isDefault && a.entityCount === b.entityCount,
);

/** A template property: entities holding a value, and templates that
 *  inherit it. Key: `templateId\u0000label` (and the name, where known). */
export const propertyUsageAtom = atomFamily(
  (k: { templateId: string; label: string; name?: string }) =>
    atom((get) => {
      const corpus = templatesCorpus(get(dataSourceAtom));
      return propertyUsage({
        templateId: k.templateId,
        prop: k,
        schema: schemaOf(corpus),
        entities: get(byTemplate(corpus))?.get(k.templateId) ?? [],
        read: get(readerAtom(corpus)),
        templateName: templateNameOf(corpus),
      });
    }),
  (a, b) => a.templateId === b.templateId && a.label === b.label && a.name === b.name,
);

/* ── Thesauri ──────────────────────────────────────────────────────────── */

const boundAtom = atomFamily((thesaurusId: string) =>
  atom((get) => {
    const source = get(dataSourceAtom);
    const corpus = thesauriCorpus(source);
    return boundProperties(schemaOf(corpus), thesaurusId, get(thesaurusBindingsAtom(source)));
  }),
);

export const thesaurusUsageAtom = atomFamily((thesaurusId: string) =>
  atom((get) => {
    const corpus = thesauriCorpus(get(dataSourceAtom));
    const groups = get(byTemplate(corpus));
    return thesaurusUsage({
      properties: get(boundAtom(thesaurusId)),
      entitiesOf: (id) => groups?.get(id) ?? [],
      read: get(readerAtom(corpus)),
      templateName: templateNameOf(corpus),
    });
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
    return (value: ThesaurusValue) =>
      valueUsage({ value, properties, entitiesOf: (id) => groups?.get(id) ?? [], read });
  }),
);

/* ── Relationship types ────────────────────────────────────────────────── */

/** A relationship type's usage, by id: the references that name it (the
 *  Sample's live store; CEJIL's counts from the importer, its references
 *  being read-only) and the relationship fields in its templates. */
export const relationTypeUsageAtom = atomFamily((id: string) =>
  atom((get) => {
    const corpus = templatesCorpus(get(dataSourceAtom));
    const references =
      corpus === "mock"
        ? get(referencesAtom).filter((x) => x.relationType === id).length
        : (cejilUsageByRelationType[id] ?? 0);
    return relationTypeUsage({
      id,
      references,
      schema: schemaOf(corpus),
      templateName: templateNameOf(corpus),
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
export const languageUsageAtom = atomFamily(
  (l: Pick<SettingsLanguage, "key" | "default" | "translationsCount">) =>
    atom((get) => {
      const corpus = templatesCorpus(get(dataSourceAtom));
      const key = l.key.toUpperCase() as Language;
      const entities =
        corpus === "cejil"
          ? cejilStats.entities
          : Object.keys(get(entityMetadataAtom)[key] ?? {}).length;
      return languageUsage({ isDefault: l.default, entities, translated: l.translationsCount });
    }),
  (a, b) => a.key === b.key && a.default === b.default && a.translationsCount === b.translationsCount,
);
