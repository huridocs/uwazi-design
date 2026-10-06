import type { Language } from "../atoms/language";
import { entityCorpusOf, getEntity, type Entity } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";
import { overlayRecord } from "../data/entityOverlay";
import { cejilEsBySid } from "../data/cejil/load";
import { templateMirror, templatesMirror } from "../data/templates/mirror";
import { displayStrings } from "./templateProjection";

/** An entity's values for one template property, by `name`, as the labels a
 *  facet lists and matches and a property sort compares (spec §6.4: Library
 *  facets from the template's `filter` flags). Thesaurus and relationship
 *  values print their label; dates and places their display string.
 *
 *  CEJIL reads the raw Spanish record (a map lookup), the one its cards, its
 *  curated facets and its search are built from; the Sample and Artworks read
 *  their projected profile; an entity edited in this session reads its record.
 *  Cached per entity object and language, so a facet's full-corpus count pass
 *  reads each value once. A save on the Sample or Artworks writes the entity's
 *  record and keeps its object, and a template edit keeps every object, so an
 *  entry also holds the record and the template list it was read from and is
 *  dropped when either changes. */
interface Entry {
  record: ReturnType<typeof overlayRecord>;
  templates: object;
  byKey: Map<string, string[]>;
}
const cache = new WeakMap<Entity, Entry>();

export function entityPropertyValues(e: Entity, name: string, lang: Language): string[] {
  const record = overlayRecord(e.id);
  const templates = templatesMirror(entityCorpusOf(e.id));
  let entry = cache.get(e);
  if (!entry || entry.record !== record || entry.templates !== templates) {
    entry = { record, templates, byKey: new Map() };
    cache.set(e, entry);
  }
  const key = `${lang}|${name}`;
  const hit = entry.byKey.get(key);
  if (hit) return hit;
  const out = read(e, name, lang);
  entry.byKey.set(key, out);
  return out;
}

function read(e: Entity, name: string, lang: Language): string[] {
  if (!overlayRecord(e.id) && entityCorpusOf(e.id) === "cejil") {
    const p = templateMirror("cejil", e.typeId)?.properties.find((x) => x.name === name);
    if (!p) return [];
    const raw = cejilEsBySid().get(e.id)?.metadata?.[name];
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
