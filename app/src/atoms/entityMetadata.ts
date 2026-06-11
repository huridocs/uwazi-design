import { atom } from "jotai";
import type { Language } from "./language";
import { entityMetadataByLanguage, type EntityMetadata } from "../data/entityMetadata";

/** A reader closure over entity metadata: same signature as `getEntityProp`,
 *  resolved against live atom state instead of the static const. The inheritance
 *  utils accept one of these so edit-at-source cascades into every inherited
 *  render. */
export type EntityPropReader = (entityId: string, propId: string, lang: Language) => string | undefined;

/** Writable atom over the source entities' native metadata. Seeded from
 *  data/entityMetadata.ts. Editing a value here (via EntityOverlay) cascades to
 *  every inherited relationship value, which all resolve through this map. */
export const entityMetadataAtom = atom<Record<Language, EntityMetadata>>(entityMetadataByLanguage);

/** Write-only helper: set one native prop of one entity in one language,
 *  immutably. */
export const setEntityPropAtom = atom(
  null,
  (
    get,
    set,
    { entityId, propId, lang, value }: { entityId: string; propId: string; lang: Language; value: string },
  ) => {
    const all = get(entityMetadataAtom);
    const forLang = all[lang] ?? {};
    set(entityMetadataAtom, {
      ...all,
      [lang]: {
        ...forLang,
        [entityId]: { ...(forLang[entityId] ?? {}), [propId]: value },
      },
    });
  },
);

/** Build a `getEntityProp`-shaped reader bound to the current atom value. */
export function makeEntityPropReader(all: Record<Language, EntityMetadata>): EntityPropReader {
  return (entityId, propId, lang) => all[lang]?.[entityId]?.[propId];
}
