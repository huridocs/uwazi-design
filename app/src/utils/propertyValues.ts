import type { Language } from "../atoms/language";
import { entityCorpusOf, getEntity, type Entity } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";
import { overlayRecord } from "../data/entityChanges";
import { cejilBySidLang, cejilEsBySid } from "../data/cejil/load";
import { travesiaEntity } from "../data/travesia/load";
import { templateMirror } from "../data/templates/mirror";
import { displayStrings } from "./templateProjection";

/** An entity's values for one template property, by `name`, as the labels a
 *  facet lists and matches (spec §6.4: Library facets from the template's
 *  `filter` flags). Thesaurus and relationship values print their label;
 *  dates and places their display string.
 *
 *  CEJIL and Travesía read the raw record (a map lookup); the Sample and
 *  Artworks read their projected profile; an entity edited in this session
 *  reads its record. Cached per entity object and language, so a facet's
 *  full-corpus count pass reads each value once. */
const LANG_CODE: Record<Language, string> = { EN: "en", ES: "es", FR: "es", AR: "es" };
const cache = new WeakMap<Entity, Map<string, string[]>>();

export function entityPropertyValues(e: Entity, name: string, lang: Language): string[] {
  let byKey = cache.get(e);
  if (!byKey) cache.set(e, (byKey = new Map()));
  const key = `${lang}|${name}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const out = read(e, name, lang);
  byKey.set(key, out);
  return out;
}

function read(e: Entity, name: string, lang: Language): string[] {
  const corpus = entityCorpusOf(e.id);
  if (!overlayRecord(e.id) && (corpus === "cejil" || corpus === "travesia")) {
    const p = templateMirror(corpus, e.typeId)?.properties.find((x) => x.name === name);
    if (!p) return [];
    const raw =
      corpus === "cejil"
        ? (cejilBySidLang().get(`${e.id}::${LANG_CODE[lang]}`) ?? cejilEsBySid().get(e.id))?.metadata?.[name]
        : travesiaEntity(e.id)?.metadata[name];
    if (p.type === "relationship")
      return (raw ?? []).map((v) => (typeof v.label === "string" ? v.label : "")).filter(Boolean);
    return displayStrings(p.type, raw);
  }
  const f = (getEntityProfile(e.id).metadata[lang] ?? []).find((x) => x.id === name);
  if (!f) return [];
  if (f.type === "relationship")
    return f.connectedEntityIds.map((id) => getEntity(id)?.title ?? f.connectedLabels?.[id] ?? "").filter(Boolean);
  if (f.values?.length) return f.values;
  if (f.displayValues?.length) return f.displayValues;
  return f.value ? [f.value] : [];
}
