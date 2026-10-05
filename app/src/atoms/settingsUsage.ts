import { atom, type Getter } from "jotai";
import { atomFamily } from "jotai/utils";
import { entityTypes, type Entity } from "../data/entities";
import { applyOverlay, type Corpus } from "../data/entityChanges";
import { cejilLibraryEntities } from "../data/cejil/adapt";
import { travesiaLibraryEntities } from "../data/travesia/adapt";
import { cejilSettingsTemplates } from "../data/cejil/settingsAdapt";
import { travesiaTemplates } from "../data/travesia/schema";
import { cejilStats } from "../data/cejil/aggregates";
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
  type ValueReader,
} from "../utils/settingsUsage";
import { cejilReadyAtom, dataSourceAtom, travesiaReadyAtom, type DataSource } from "./dataSource";
import { entitiesAtom } from "./entities";
import { entityAccessAtom, libraryEntityOverlayAtom } from "./entityChanges";
import { entityMetadataAtom } from "./entityMetadata";
import type { Language } from "./language";
import { referencesAtom, relationTypesAtom } from "./references";
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

/** How each corpus reads an entity's values for a property. */
const readerAtom = atomFamily((corpus: Corpus) =>
  atom<ValueReader>((get) => {
    if (corpus === "cejil" || corpus === "travesia")
      return (e, p) =>
        (e.searchFields ?? e.fields ?? [])
          .filter((f) => (f.key ? f.key === p.name : f.label === p.label))
          .map((f) => f.value);
    const native = get(entityMetadataAtom).EN;
    return (e, p) => {
      const v = native[e.id]?.[p.name];
      return v ? [v] : [];
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

/** Entities holding one value of a thesaurus. Read once per removal, so a
 *  plain getter rather than a family per value. */
export const valueUsageAtom = atom((get) => {
  const corpus = thesauriCorpus(get(dataSourceAtom));
  const groups = get(byTemplate(corpus));
  const read = get(readerAtom(corpus));
  return (thesaurusId: string, value: ThesaurusValue) =>
    valueUsage({ value, properties: get(boundAtom(thesaurusId)), entitiesOf: (id) => groups?.get(id) ?? [], read });
});

/* ── Relationship types ────────────────────────────────────────────────── */

/** Settings lists relationship types by name; the Sample's references and
 *  fields name them by registry id (Review B5), so the Sample matches by
 *  label. CEJIL's Settings ids are the ids its references use. */
export const relationTypeUsageAtom = atomFamily(
  (r: { id: string; name: string; usageCount: number }) =>
    atom((get) => {
      const corpus = templatesCorpus(get(dataSourceAtom));
      const fold = (s: string) => s.trim().toLowerCase();
      const registryId =
        corpus === "mock" ? get(relationTypesAtom).find((t) => fold(t.label) === fold(r.name))?.id : r.id;
      const references =
        corpus === "mock"
          ? registryId
            ? get(referencesAtom).filter((x) => x.relationType === registryId).length
            : 0
          : r.usageCount;
      return {
        registryId,
        ...relationTypeUsage({
          registryId,
          references,
          schema: schemaOf(corpus),
          templateName: templateNameOf(corpus),
          writable: corpus === "mock",
        }),
      };
    }),
  (a, b) => a.id === b.id && a.name === b.name && a.usageCount === b.usageCount,
);

/** Move every Sample reference of one type to another. */
export const reassignReferencesAtom = atom(null, (get, set, { from, to }: { from: string; to: string }) => {
  set(
    referencesAtom,
    get(referencesAtom).map((r) => (r.relationType === from ? { ...r, relationType: to } : r)),
  );
});

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
