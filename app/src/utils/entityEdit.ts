import type { Language } from "../atoms/language";
import type { CardField, Entity } from "../data/entities";
import { chosenLabels, type AnyMetadataField, type MetadataField } from "../data/metadata";

/** Writing an edited record back — the pieces a single edit's Save and the
 *  bulk form's Apply share. Pure: the atoms in `atoms/entityOverlay.ts` call
 *  these and write the result through the overlay. */

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

/** A record's field list with `edited` scalar values over it. Relationship
 *  fields are kept where they are: the form edits scalars, and a record
 *  replaces the entity's WHOLE metadata (see `profileFromRecord`), so leaving
 *  them out would delete every connection the entity has. A field the base
 *  never held is appended when it now holds something. */
export function mergeScalars(base: AnyMetadataField[], edited: MetadataField[]): AnyMetadataField[] {
  const byId = new Map(edited.map((f) => [f.id, f]));
  const out: AnyMetadataField[] = base.map((f) => (f.type === "relationship" ? f : byId.get(f.id) ?? f));
  const present = new Set(base.map((f) => f.id));
  for (const f of edited) if (!present.has(f.id) && (f.value?.trim() || f.values?.length)) out.push(f);
  return out;
}

export function mergeScalarsByLang(
  base: Record<Language, AnyMetadataField[]>,
  edited: Record<Language, MetadataField[]>,
): Record<Language, AnyMetadataField[]> {
  return Object.fromEntries(LANGS.map((l) => [l, mergeScalars(base[l] ?? [], edited[l] ?? [])])) as Record<
    Language,
    AnyMetadataField[]
  >;
}

/** The ids of the scalar fields whose value differs between two lists. */
export function changedFieldIds(before: AnyMetadataField[], after: AnyMetadataField[]): Set<string> {
  const was = new Map(before.filter((f) => f.type !== "relationship").map((f) => [f.id, f as MetadataField]));
  const out = new Set<string>();
  for (const f of after) {
    if (f.type === "relationship") continue;
    const old = was.get(f.id);
    if (!old || old.value !== f.value || (old.values ?? []).join("\u0000") !== (f.values ?? []).join("\u0000"))
      out.add(f.id);
  }
  return out;
}

/** A card line holding `f`, the way the CEJIL adapter builds one: the first
 *  value, the next few as `values`, the rest counted in `more`. */
function cardLine(line: CardField, f: MetadataField): CardField {
  if (f.type === "select" || f.type === "multiselect") {
    const labels = chosenLabels(f);
    return { ...line, value: labels[0] ?? "", more: Math.max(0, labels.length - 1), values: labels.slice(0, 4) };
  }
  return { ...line, value: f.value, more: 0, values: undefined };
}

/** The entity-level patch an ADAPTER corpus needs after its record changed.
 *  Those corpora carry their card lines (`fields`), their search text
 *  (`searchFields`) and their descriptor facet (`descriptors`) on the entity,
 *  computed once from the seed, so a changed record alone would leave the card,
 *  the search and the facet saying the old value. The Sample corpus reads its
 *  record for all three and needs none of this. */
export function adapterPatch(entity: Entity, fields: AnyMetadataField[], changed: Set<string>): Partial<Entity> {
  if (changed.size === 0) return {};
  const byId = new Map(
    fields.filter((f): f is MetadataField => f.type !== "relationship").map((f) => [f.id, f]),
  );
  const patch: Partial<Entity> = {};
  if (entity.fields?.some((c) => c.key && changed.has(c.key))) {
    patch.fields = entity.fields
      .map((c) => {
        const f = c.key && changed.has(c.key) ? byId.get(c.key) : undefined;
        return f ? cardLine(c, f) : c;
      })
      .filter((c) => c.value);
  }
  if (entity.searchFields) {
    const next = entity.searchFields
      .map((s) => {
        const f = s.key && changed.has(s.key) ? byId.get(s.key) : undefined;
        return f ? { ...s, value: f.value } : s;
      })
      .filter((s) => s.value);
    const had = new Set(entity.searchFields.map((s) => s.key));
    for (const id of changed) {
      const f = byId.get(id);
      if (f && !had.has(id) && f.value && id !== "descriptores") next.push({ key: id, label: f.label, value: f.value });
    }
    patch.searchFields = next;
  }
  // CEJIL's descriptor facet is the `descriptores` property, hoisted.
  if (changed.has("descriptores")) {
    const f = byId.get("descriptores");
    patch.descriptors = f ? chosenLabels(f) : [];
  }
  return patch;
}
