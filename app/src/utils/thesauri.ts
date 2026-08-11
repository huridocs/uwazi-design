import { seedThesaurusValues } from "../data/settings";
import { cejilThesauri } from "../data/cejil/thesauri";

/**
 * Child value → parent group, across every thesaurus the prototype knows
 * (mock seed + the CEJIL dump). Uwazi nests thesauri exactly one level — a
 * value carrying `values` is a group whose children are the selectable
 * values — so a flat label→parent map is the whole hierarchy.
 *
 * Keyed by LABEL because that is what the prototype stores: mock entity
 * metadata and CEJIL's denormalized `metadata[prop][].label` both carry the
 * child's display string, not its thesaurus id. Localized child labels (the
 * `region` inheritance demo translates its values) get explicit aliases below —
 * a real backend would resolve by id and translate both ends.
 */
const childToParent = new Map<string, string>();

for (const values of Object.values(seedThesaurusValues)) {
  for (const v of values) {
    for (const c of v.values ?? []) {
      if (!childToParent.has(c.label)) childToParent.set(c.label, v.label);
    }
  }
}
for (const t of cejilThesauri) {
  for (const v of t.values ?? []) {
    for (const c of v.values ?? []) {
      if (!childToParent.has(c.label)) childToParent.set(c.label, v.label);
    }
  }
}

/** Localized (child, parent) label pairs for the values the mock localizes
 *  (entityMetadata's ES/FR/AR `region` overrides). */
const LOCALIZED_PAIRS: [string, string][] = [
  // ES
  ["Centroamérica", "Américas"],
  ["Sudamérica", "Américas"],
  ["Norteamérica", "Américas"],
  // FR
  ["Amérique centrale", "Amériques"],
  ["Amérique du Sud", "Amériques"],
  ["Amérique du Nord", "Amériques"],
  // AR
  ["أمريكا الوسطى", "الأمريكتان"],
  ["أمريكا الجنوبية", "الأمريكتان"],
  ["أمريكا الشمالية", "الأمريكتان"],
];
for (const [child, parent] of LOCALIZED_PAIRS) {
  if (!childToParent.has(child)) childToParent.set(child, parent);
}

/** The group a nested thesaurus value belongs to, or undefined for top-level
 *  values and free text. Drives the "parent › child" context treatment. */
export function thesaurusParentOf(label: string): string | undefined {
  return childToParent.get(label);
}
