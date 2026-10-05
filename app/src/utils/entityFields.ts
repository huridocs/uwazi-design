import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import type { AnyMetadataField, MetadataField } from "../data/metadata";
import { getEntity, entityCorpusOf, type CardField } from "../data/entities";
import { templateMirror } from "../data/templates/mirror";
import type { TemplateDef } from "../data/templates/types";
import { getEntityProfile } from "../data/entityProfiles";
import { kindOfFieldType, kindOfUwaziType, type PropertyKind } from "./propertyKind";

/** One resolved scalar property of an entity — a label and the value to print.
 *  `more` is the "+N" tail a summarising adapter leaves on a multi-valued
 *  property. */
export interface EntityScalarField {
  id: string;
  /** The TEMPLATE's property name, where the corpus has one. This is the key the
   *  metadata record puts on its field cards (`data-field-key`), so it is what a
   *  card can send to `focusMetadataFieldAtom` to say WHICH property was
   *  clicked. `id` above cannot do that job: for an adapter corpus it is
   *  synthesized from the localized label, which the record has never seen. */
  key?: string;
  /** What the property is — see `utils/propertyKind`. */
  kind?: PropertyKind;
  label: string;
  value: string;
  /** The first few values of a multi-valued property — see `CardField`. */
  values?: string[];
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
      // `key` FIRST where the adapter supplies one: it is stable across
      // languages and matches the record, where `${label}-${i}` matches nothing
      // and changes the moment a property above it resolves to empty.
      id: f.key ?? `${f.label}-${i}`,
      key: f.key,
      kind: f.kind,
      label: f.label,
      value: f.value,
      values: f.values,
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
    .map((f) => ({
      id: f.id,
      key: f.id,
      kind: kindOfFieldType(f.type),
      label: f.label,
      value: String(f.value),
    }));
}

/* ── Cards from the template (template-schema-spec.md §6.2) ───────────────
   A card shows the properties its template marks `showInCard`, in template
   order. Where the corpus precomputes formatted lines (CEJIL, Travesía: years
   for dates, places, "+N" tails), the card picks those by property name;
   elsewhere it projects them from the record. The flags are read at render,
   so a change in Settings reaches the card at once. */

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
/** Types that are not a card line: the picture is the thumbnail, a paragraph
 *  is a footer mark, a preview has no value. */
const NOT_A_LINE = new Set(["image", "preview", "markdown"]);

/** A record field as a card line. */
function lineOf(f: AnyMetadataField): EntityScalarField | null {
  if (f.type === "relationship") {
    const titles = f.connectedEntityIds.map((id) => getEntity(id)?.title ?? f.connectedLabels?.[id]).filter((t): t is string => !!t);
    if (!titles.length) return null;
    return {
      id: f.id,
      key: f.id,
      kind: "relationship",
      label: f.label,
      value: titles[0],
      ...(titles.length > 1 ? { values: titles.slice(0, 4), more: titles.length - 1 } : {}),
    };
  }
  const list = f.displayValues?.length ? f.displayValues : f.values?.length ? f.values : f.value ? [f.value] : [];
  if (!list.length || list[0] === "—") return null;
  return {
    id: f.id,
    key: f.id,
    kind: (f.propertyType && kindOfUwaziType(f.propertyType)) || kindOfFieldType(f.type),
    label: f.label,
    value: list[0],
    ...(list.length > 1 ? { values: list.slice(0, 4), more: list.length - 1 } : {}),
  };
}

/** The card's lines for an entity: its template's `showInCard` properties
 *  that hold a value, in template order. An entity whose template is unknown
 *  (a corpus without one) keeps every scalar line, as before. */
export function entityCardFields(entity: Entity, language: Language): EntityScalarField[] {
  const corpus = entityCorpusOf(entity.id);
  const template = templateMirror(corpus, entity.typeId);
  if (!template) return entityScalarFields(entity, language);
  const shown = shownNames(template);
  if (!shown.length) return [];
  // Precomputed lines, by property name (CEJIL, Travesía; an edited entity's
  // lines are kept current by `adapterPatch`).
  if (entity.fields && corpus !== "artworks" && entity.fields.some((f) => f.prop)) {
    const byProp = new Map<string, CardField>();
    for (const f of entity.fields) if (f.prop && !byProp.has(f.prop)) byProp.set(f.prop, f);
    const out: EntityScalarField[] = [];
    for (const name of shown) {
      const f = byProp.get(name);
      if (f) out.push({ id: f.key ?? f.prop!, key: f.key, kind: f.kind, label: f.label, value: f.value, values: f.values, more: f.more });
    }
    return out;
  }
  // Projected from the record (the Sample, Artworks).
  const fields = getEntityProfile(entity.id).metadata[language] ?? [];
  const byName = new Map(fields.map((f) => [f.id, f]));
  const out: EntityScalarField[] = [];
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
  if (entity.fields && entityCorpusOf(entity.id) !== "artworks") {
    const f = entity.fields.find((x) => x.prop === name);
    if (f) return { id: name, key: f.key, kind: f.kind, label: f.label, value: f.value, values: f.values, more: f.more };
    if (entity.fields.some((x) => x.prop)) return undefined;
  }
  const field = (getEntityProfile(entity.id).metadata[language] ?? []).find((f) => f.id === name);
  return field ? (lineOf(field) ?? undefined) : undefined;
}

/** A list column a corpus offers: one per template property `name`. */
export interface PropertyColumn {
  name: string;
  label: string;
  /** Uwazi's `prioritySorting`: the column sorts. */
  sortable: boolean;
}

/** Types that share a column under one name (Uwazi's combine rule). */
const COMPATIBLE: Record<string, string> = {
  multiselect: "select",
  multidate: "date",
  multidaterange: "daterange",
  markdown: "text",
};
const family = (t: string) => COMPATIBLE[t] ?? t;
/** Not a column: a picture, a preview, a table, a recording, a paragraph
 *  (spec §2.1: too long for a cell). */
const NOT_A_COLUMN = new Set(["image", "preview", "nested", "media", "markdown"]);

/** The columns a corpus's templates offer, in template order: properties
 *  with the same name and a compatible type are one column, labelled as the
 *  first template has it. Cached per template list. */
const columnsCache = new WeakMap<TemplateDef[], PropertyColumn[]>();
export function propertyColumns(templates: TemplateDef[]): PropertyColumn[] {
  const hit = columnsCache.get(templates);
  if (hit) return hit;
  const byName = new Map<string, { col: PropertyColumn; family: string }>();
  for (const t of templates)
    for (const p of t.properties) {
      if (NOT_A_COLUMN.has(p.type)) continue;
      const seen = byName.get(p.name);
      if (seen && seen.family === family(p.type)) {
        if (p.prioritySorting) seen.col.sortable = true;
        continue;
      }
      if (seen) continue; // same name, another type: the first one keeps the column
      byName.set(p.name, { col: { name: p.name, label: p.label, sortable: !!p.prioritySorting }, family: family(p.type) });
    }
  const out = [...byName.values()].map((x) => x.col);
  columnsCache.set(templates, out);
  return out;
}

/** The value an entity carries for one property label, or undefined.
 *
 *  The list table addresses metadata columns by LABEL rather than by property
 *  id, because label is the only key the two corpora share — an adapter's
 *  `fields` carry no id, and the mock profile's ids are per-template. It is also
 *  what the column header prints, so a column can never be titled one thing and
 *  filled from another. */
export function entityFieldValue(
  entity: Entity,
  label: string,
  language: Language,
): EntityScalarField | undefined {
  return entityScalarFields(entity, language).find((f) => f.label === label);
}

/** How many entities a label scan reads before it stops.
 *
 *  The offered metadata columns are a MENU, not a result: they must be stable
 *  while you scroll and cheap enough to derive beside the Library's existing
 *  full-corpus passes (which are already the measured cost — see CLAUDE.md).
 *  Distinct labels saturate within the first page or two of any real corpus;
 *  4,398 CEJIL entities offer the same ~12 labels as the first 400 do. */
export const FIELD_LABEL_SCAN_CAP = 400;

/** The distinct property labels present in a corpus, in first-seen order. */
export function distinctFieldLabels(entities: Entity[], language: Language): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of entities.slice(0, FIELD_LABEL_SCAN_CAP)) {
    for (const f of entityScalarFields(e, language)) {
      if (!seen.has(f.label)) {
        seen.add(f.label);
        out.push(f.label);
      }
    }
  }
  return out;
}
