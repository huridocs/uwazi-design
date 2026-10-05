import type { Language } from "../atoms/language";
import type { Corpus } from "../data/entityChanges";
import type { MetadataField } from "../data/metadata";
import type { PropertyDef, PropertyType, TemplateDef } from "../data/templates/types";
import { lbl } from "../data/sample/typeFields";

/** The one place a template becomes the fields a form, a record, Copy From,
 *  bulk edit and Change template read (template-schema-spec.md §4.5).
 *
 *  Step M2 projects blank forms: one field per property the form can edit, in
 *  template order, empty. Records move onto it in M3 (CEJIL, Travesía) and
 *  M4 (Sample, Artworks). A field's `id` is the property's `name`, the key
 *  every key-based feature already uses; `propertyType` is the template's
 *  type, and the legacy `type` is derived from it. */

/** The editor a property type gets today. `null`: no editor yet, so a blank
 *  form leaves it out (relationship, geolocation, image and the list types'
 *  pickers arrive with M3b). */
const LEGACY_TYPE: Record<PropertyType, MetadataField["type"] | null> = {
  text: "text",
  markdown: "multiline",
  numeric: "text",
  date: "date",
  multidate: "text",
  daterange: "text",
  multidaterange: "text",
  select: "select",
  multiselect: "multiselect",
  link: "link",
  media: "media",
  generatedid: "text",
  relationship: null,
  geolocation: null,
  image: null,
  preview: null,
  nested: null,
};

export const legacyTypeOf = (t: PropertyType) => LEGACY_TYPE[t] ?? null;

/** A property's label in a reading language. The Sample is translated, and
 *  its field table holds the other languages (decision S5 keeps the template
 *  in English; this is the translation layer's job, done here until
 *  Translations exists). The imported corpora are one-language: the label as
 *  the template has it. */
export function propertyLabel(corpus: Corpus, p: PropertyDef, lang: Language): string {
  return corpus === "mock" ? lbl(p.name, lang) : p.label;
}

/** One property as an empty form field, or null when the form has no editor
 *  for its type. */
export function blankField(corpus: Corpus, p: PropertyDef, lang: Language): MetadataField | null {
  const type = legacyTypeOf(p.type);
  if (!type) return null;
  // A select bound to no thesaurus stays a select: the form offers "New
  // thesaurus" for exactly that case.
  return {
    id: p.name,
    label: propertyLabel(corpus, p, lang),
    propertyType: p.type,
    type,
    value: "",
    ...((p.type === "select" || p.type === "multiselect") && p.content ? { thesaurus: p.content } : {}),
    ...(p.type === "multiselect" ? { values: [] } : {}),
    // A list the form edits as one string; the bulk form leaves it out.
    ...(p.type === "multidate" || p.type === "multidaterange" ? { list: true } : {}),
  };
}

/** A template's blank form in one language: its properties in order, the
 *  common ones (title, dates) left to the form's own header. */
export function blankFieldsFor(corpus: Corpus, template: TemplateDef | undefined, lang: Language): MetadataField[] {
  const out: MetadataField[] = [];
  for (const p of template?.properties ?? []) {
    const f = blankField(corpus, p, lang);
    if (f) out.push(f);
  }
  return out;
}
