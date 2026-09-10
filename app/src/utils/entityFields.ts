import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import type { MetadataField } from "../data/metadata";
import { getEntityProfile } from "../data/entityProfiles";
import { kindOfFieldType, type PropertyKind } from "./propertyKind";

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
