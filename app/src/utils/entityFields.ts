import type { Language } from "../atoms/language";
import type { AnyMetadataField, MetadataField } from "../data/metadata";
import { getEntity, entityCorpusOf, type CardField, type Entity } from "../data/entities";
import { templateMirror } from "../data/templates/mirror";
import type { TemplateDef } from "../data/templates/types";
import { getEntityProfile } from "../data/entityProfiles";

/** One resolved scalar property of an entity — a label and the value to print.
 *  `more` is the "+N" tail a summarising adapter leaves on a multi-valued
 *  property. */
export interface EntityScalarField {
  id: string;
  label: string;
  value: string;
  more?: number;
}

/** Every non-empty scalar property of an entity, in template order.
 *
 *  Two corpora answer this differently and both answers were living inside
 *  `EntityCard`: adapters that carry real metadata supply `entity.fields`
 *  (CEJIL, artworks), while the mock sample has none and derives them from its
 *  `entityProfiles` record instead. That worked while the CARD was the only
 *  thing asking. The list table's metadata columns ask the same question, and
 *  two copies of "what properties does this entity have" would drift the first
 *  time either corpus changed shape — so it is one function, here.
 *
 *  Relationship fields are excluded (they hold connected entity ids, not a
 *  value), as are em-dashes: a property that resolved to nothing is not a
 *  property this entity has. */
export function entityScalarFields(entity: Entity, language: Language): EntityScalarField[] {
  if (entity.fields) {
    return entity.fields.map((f, i) => ({
      id: `${f.label}-${i}`,
      label: f.label,
      value: f.value,
      more: f.more,
    }));
  }
  return (getEntityProfile(entity.id).metadata[language] ?? [])
    .filter(
      (f): f is MetadataField =>
        f.type !== "relationship" &&
        !!(f as MetadataField).value &&
        (f as MetadataField).value !== "—",
    )
    .map((f) => ({ id: f.id, label: f.label, value: String(f.value) }));
}

/* ── Cards from the template (template-schema-spec.md §6.2) ───────────────
   A card shows the properties its template marks `showInCard`, in template
   order. Where the corpus precomputes formatted lines (CEJIL, Artworks: years
   for dates, "+N" tails, an artist's "Lived"), the card picks those by
   property name; the Sample projects them from the record. The flags are read
   at render, so a change in Settings reaches the card at once. */

/** Types that are not a card line: the picture is the thumbnail, a preview
 *  has no value. */
const NOT_A_LINE = new Set(["image", "preview"]);

/** The names a template shows on cards, in order. Cached per template object
 *  (the store hands out a new one on change). */
const shownCache = new WeakMap<TemplateDef, string[]>();
function shownNames(t: TemplateDef): string[] {
  let names = shownCache.get(t);
  if (!names) {
    names = t.properties.filter((p) => p.showInCard && !NOT_A_LINE.has(p.type)).map((p) => p.name);
    shownCache.set(t, names);
  }
  return names;
}

/** A record field as a card line: its value, or its connected entities'
 *  titles, with the "+N" tail. */
function lineOf(f: AnyMetadataField): EntityScalarField | null {
  if (f.type === "relationship") {
    const titles = f.connectedEntityIds
      .map((id) => getEntity(id)?.title ?? f.connectedLabels?.[id])
      .filter((t): t is string => !!t);
    if (!titles.length) return null;
    return { id: f.id, label: f.label, value: titles[0], ...(titles.length > 1 ? { more: titles.length - 1 } : {}) };
  }
  if (!f.value || f.value === "—") return null;
  return { id: f.id, label: f.label, value: String(f.value) };
}

/** The card's lines for an entity: its template's `showInCard` properties
 *  that hold a value, in template order. An entity whose template is unknown
 *  keeps every scalar line, as before.
 *
 *  Every card asks on every keystroke (the deferred query re-renders it), so
 *  the answer is kept per entity object and reused while the template, the
 *  language and the values it was read from are the same objects. */
interface CardEntry {
  corpus: ReturnType<typeof entityCorpusOf>;
  template: TemplateDef;
  language: Language;
  source: unknown;
  lines: EntityScalarField[];
}
const cardCache = new WeakMap<Entity, CardEntry>();

export function entityCardFields(entity: Entity, language: Language): EntityScalarField[] {
  const hit = cardCache.get(entity);
  const corpus = hit?.corpus ?? entityCorpusOf(entity.id);
  const template = templateMirror(corpus, entity.typeId);
  if (!template) return entityScalarFields(entity, language);
  // Precomputed lines, by property name (CEJIL, Artworks; an edited entity's
  // lines are kept current by `adapterPatch`); else the record (the Sample).
  const precomputed = !!entity.fields?.some((f) => f.prop);
  const source = precomputed ? entity.fields : getEntityProfile(entity.id).metadata[language];
  if (hit && hit.template === template && hit.language === language && hit.source === source) return hit.lines;
  const lines = cardLines(entity, shownNames(template), precomputed, source as AnyMetadataField[] | undefined);
  cardCache.set(entity, { corpus, template, language, source, lines });
  return lines;
}

function cardLines(
  entity: Entity,
  shown: string[],
  precomputed: boolean,
  record: AnyMetadataField[] | undefined,
): EntityScalarField[] {
  const out: EntityScalarField[] = [];
  if (!shown.length) return out;
  if (precomputed) {
    const byProp = new Map<string, CardField>();
    for (const f of entity.fields!) if (f.prop && !byProp.has(f.prop)) byProp.set(f.prop, f);
    for (const name of shown) {
      const f = byProp.get(name);
      if (f) out.push({ id: f.prop!, label: f.label, value: f.value, more: f.more });
    }
    return out;
  }
  const byName = new Map((record ?? []).map((f) => [f.id, f]));
  for (const name of shown) {
    const f = byName.get(name);
    const line = f ? lineOf(f) : null;
    if (line) out.push(line);
  }
  return out;
}

/** The value an entity carries for one template property, by its `name`, or
 *  undefined (spec §6.3: list columns are keyed by name, not by label). The
 *  corpus's formatted line where it has one, else the record's field. */
export function entityPropertyValue(entity: Entity, name: string, language: Language): EntityScalarField | undefined {
  // Not Artworks': an artist's "Lived" line is two properties, so a Born or
  // Died column reads the record.
  if (entity.fields?.some((x) => x.prop) && entityCorpusOf(entity.id) !== "artworks") {
    const f = entity.fields.find((x) => x.prop === name);
    return f ? { id: name, label: f.label, value: f.value, more: f.more } : undefined;
  }
  const field = (getEntityProfile(entity.id).metadata[language] ?? []).find((f) => f.id === name);
  return field ? (lineOf(field) ?? undefined) : undefined;
}

/** A list column a corpus offers: one per template property `name`. */
export interface PropertyColumn {
  name: string;
  label: string;
}

/** Not a column: a picture, a preview, a table, a recording. */
const NOT_A_COLUMN = new Set(["image", "preview", "nested", "media"]);

/** The columns a set of templates offers, in template order: properties
 *  sharing a name are one column, labelled as the first template has it.
 *  Cached per template list. */
const columnsCache = new WeakMap<TemplateDef[], PropertyColumn[]>();
export function propertyColumns(templates: TemplateDef[]): PropertyColumn[] {
  const hit = columnsCache.get(templates);
  if (hit) return hit;
  const byName = new Map<string, PropertyColumn>();
  for (const t of templates)
    for (const p of t.properties) {
      if (NOT_A_COLUMN.has(p.type)) continue;
      if (!byName.has(p.name)) byName.set(p.name, { name: p.name, label: p.label });
    }
  const out = [...byName.values()];
  columnsCache.set(templates, out);
  return out;
}
