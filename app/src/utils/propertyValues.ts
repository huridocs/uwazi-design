import type { Language } from "../atoms/language";
import { entityCorpusOf, getEntity, type Entity } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";
import { overlayRecord } from "../data/entityChanges";
import { cejilBySidLang, cejilEsBySid } from "../data/cejil/load";
import { travesiaEntity } from "../data/travesia/load";
import { nepalEntity } from "../data/nepal/load";
import { templateMirror, templatesMirror } from "../data/templates/mirror";
import { displayStrings } from "./templateProjection";

/** An entity's values for one template property, by `name`, as the labels a
 *  facet lists and matches (spec §6.4: Library facets from the template's
 *  `filter` flags). Thesaurus and relationship values print their label;
 *  dates and places their display string.
 *
 *  CEJIL and Travesía read the raw record (a map lookup); the Sample and
 *  Artworks read their projected profile; an entity edited in this session
 *  reads its record. Cached per entity object and language, so a facet's
 *  full-corpus count pass reads each value once. A save on the Sample or
 *  Artworks writes the entity's record and keeps its object, and a template
 *  edit keeps every object, so an entry also holds the record and the
 *  template list it was read from and is dropped when either changes. */
const LANG_CODE: Record<Language, string> = { EN: "en", ES: "es", FR: "es", AR: "es" };
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
  const corpus = entityCorpusOf(e.id);
  if (!overlayRecord(e.id) && (corpus === "cejil" || corpus === "travesia" || corpus === "nepal")) {
    const p = templateMirror(corpus, e.typeId)?.properties.find((x) => x.name === name);
    if (!p) return [];
    const raw =
      corpus === "cejil"
        ? (cejilBySidLang().get(`${e.id}::${LANG_CODE[lang]}`) ?? cejilEsBySid().get(e.id))?.metadata?.[name]
        : corpus === "nepal"
          ? nepalEntity(e.id)?.metadata[name]
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

/** A value as a closed interval in ms (dates, a day wide; date ranges, from
 *  the first day to the last) or as a number twice (numeric). */
export type ValueInterval = readonly [number, number];

const DAY = 86_400_000;
const utcDay = (y: number, m: number, d: number): ValueInterval => {
  const t = Date.UTC(y, m - 1, d);
  return [t, t + DAY - 1];
};

/** One display date as the days it covers: "dd/mm/yyyy" (the projection's
 *  format), ISO "yyyy-mm-dd", "yyyy-mm", a bare year (the Sample's filing
 *  years), else whatever `Date.parse` reads. */
function dateInterval(s: string): ValueInterval | null {
  const v = s.trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (m) return utcDay(+m[3], +m[2], +m[1]);
  m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(v);
  if (m) return utcDay(+m[1], +m[2], +m[3]);
  m = /^(\d{4})[-/](\d{1,2})$/.exec(v);
  if (m) return [Date.UTC(+m[1], +m[2] - 1, 1), Date.UTC(+m[1], +m[2], 1) - 1];
  m = /^(\d{4})$/.exec(v);
  if (m) return [Date.UTC(+m[1], 0, 1), Date.UTC(+m[1] + 1, 0, 1) - 1];
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : [t, t + DAY - 1];
}

/** A display value as an interval: a number, a date, or a date range
 *  ("a – b", either end open). */
function toInterval(s: string, kind: "number" | "date"): ValueInterval | null {
  if (kind === "number") {
    const n = Number(s.replace(/[,\s]/g, ""));
    return Number.isFinite(n) ? [n, n] : null;
  }
  const parts = s.split(/\s[–-]\s?|\s?[–-]\s/);
  if (parts.length === 2) {
    const a = parts[0].trim() ? dateInterval(parts[0]) : null;
    const b = parts[1].trim() ? dateInterval(parts[1]) : null;
    if (!a && !b) return null;
    return [a ? a[0] : -Infinity, b ? b[1] : Infinity];
  }
  return dateInterval(s);
}

/** An entity's values for a numeric or date property as intervals, read from
 *  the same display strings the facets list, so a range and a value list
 *  never disagree about a record. Cached per value list. */
const intervalCache = new WeakMap<readonly string[], ValueInterval[]>();
export function entityPropertyIntervals(
  e: Entity,
  name: string,
  lang: Language,
  kind: "number" | "date",
): ValueInterval[] {
  const vals = entityPropertyValues(e, name, lang);
  let hit = intervalCache.get(vals);
  if (!hit) {
    hit = [];
    for (const v of vals) {
      const iv = toInterval(v, kind);
      if (iv) hit.push(iv);
    }
    intervalCache.set(vals, hit);
  }
  return hit;
}
