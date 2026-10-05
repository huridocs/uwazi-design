import type { PropertyDef, PropertyType, TemplateDef } from "../data/templates/types";

/** Uwazi's template editor rules, in one place (page-briefs.md, "Template
 *  editor" and "Template property dialog"): one label per type, which panel
 *  fields each type offers, the name and label checks with Uwazi's messages,
 *  the same-label comparison and the inherit guard. Pure functions over the
 *  template store's shapes; the editor and the store both call them. */

/** One label per type, used by the type select, the read-only Type box, the
 *  property table and the same-label table (Uwazi's select and its tables
 *  disagree on "Multiple date(s)"; the select's wording is kept). */
export const TYPE_LABELS: Record<PropertyType, string> = {
  text: "Text",
  markdown: "Rich text",
  numeric: "Numeric",
  date: "Date",
  multidate: "Multiple dates",
  daterange: "Date range",
  multidaterange: "Multiple date ranges",
  select: "Select",
  multiselect: "Multiple select",
  relationship: "Relationship",
  link: "Link",
  image: "Image",
  preview: "Preview",
  media: "Media",
  geolocation: "Geolocation",
  generatedid: "Generated ID",
  nested: "Violated articles",
};

/** The Property type select, in Uwazi's order. `nested` is CEJIL's only and
 *  is not offered for new properties. */
export const ADDABLE_TYPES: PropertyType[] = [
  "text",
  "markdown",
  "numeric",
  "date",
  "multidate",
  "daterange",
  "multidaterange",
  "select",
  "multiselect",
  "relationship",
  "link",
  "image",
  "preview",
  "media",
  "geolocation",
  "generatedid",
];

const FILTERABLE = new Set<PropertyType>([
  "text",
  "markdown",
  "numeric",
  "date",
  "multidate",
  "daterange",
  "multidaterange",
  "select",
  "multiselect",
  "relationship",
  "generatedid",
  "nested",
]);
const PRIORITY = new Set<PropertyType>(["text", "numeric", "select", "date"]);
const STYLED = new Set<PropertyType>(["image", "preview", "media"]);

/** Which of a template's three common properties a row is, if any. */
export type CommonKind = "title" | "date" | null;
export const commonKindOf = (p: PropertyDef): CommonKind =>
  p.name === "title" ? "title" : p.name === "creationDate" || p.name === "editDate" ? "date" : null;

/** The panel fields a property shows (ConfigPropertyPanel.tsx). `filter` is the
 *  property's current Use as filter, which Default filter and, on custom
 *  properties, Priority sorting depend on. */
export function panelFields(type: PropertyType, common: CommonKind, filter: boolean) {
  if (common)
    return {
      style: false,
      fullWidth: false,
      thesaurus: false,
      relationship: false,
      hideLabel: false,
      required: false,
      showInCard: false,
      filter: false,
      defaultfilter: false,
      prioritySorting: true,
      generatedId: common === "title",
      labelEditable: common === "title",
      sameLabel: false,
    };
  const filterable = FILTERABLE.has(type);
  return {
    style: STYLED.has(type),
    fullWidth: STYLED.has(type),
    thesaurus: type === "select" || type === "multiselect",
    relationship: type === "relationship",
    hideLabel: true,
    required: true,
    showInCard: true,
    filter: filterable,
    defaultfilter: filterable && filter,
    prioritySorting: filterable && filter && PRIORITY.has(type),
    generatedId: false,
    labelEditable: true,
    sameLabel: true,
  };
}

/** A property moved to another type (new properties only): the label and
 *  every flag the new type still offers are kept, the rest is dropped
 *  (Uwazi wipes the whole form on a type change). */
export function withType(p: PropertyDef, type: PropertyType): PropertyDef {
  const f = panelFields(type, null, !!p.filter);
  const next: PropertyDef = { id: p.id, name: p.name, label: p.label, type };
  if (p.noLabel) next.noLabel = true;
  if (p.required) next.required = true;
  if (p.showInCard) next.showInCard = true;
  if (f.filter && p.filter) next.filter = true;
  if (f.filter && p.filter && p.defaultfilter) next.defaultfilter = true;
  if (f.prioritySorting && p.prioritySorting) next.prioritySorting = true;
  if (f.style) next.style = p.style ?? "cover";
  if (f.fullWidth && p.fullWidth) next.fullWidth = true;
  if (f.thesaurus && p.content && (p.type === "select" || p.type === "multiselect")) next.content = p.content;
  return next;
}

/** Use as filter turned off clears Default filter and Priority sorting, as
 *  Uwazi does. Only on the user's untick: opening a saved property never
 *  rewrites its flags. */
export function withFilter(p: PropertyDef, on: boolean): PropertyDef {
  if (on) return { ...p, filter: true };
  const { filter: _f, defaultfilter: _d, prioritySorting: _p, ...rest } = p;
  return rest;
}

/* ── Names and labels ─────────────────────────────────────────────────── */

const fold = (s: string) => s.trim().toLowerCase();

/** Uwazi's template name rule, with its two defects not copied: the name is
 *  trimmed (whitespace only counts as empty), and the duplicate check is one
 *  case-insensitive rule on create and on edit. */
export function templateNameIssue(list: TemplateDef[], selfId: string | null, name: string): string | null {
  if (!name.trim()) return "Template name is required";
  if (list.some((t) => t.id !== selfId && fold(t.name) === fold(name))) return "Template name already exists";
  return null;
}

/** Labels a custom property can never take: the common properties' own. */
const COMMON_LABELS = ["Title", "Date added", "Date modified"];

/** A property label in the template being edited (the draft): required after
 *  trimming, and unique, case- and trim-insensitively, among the draft's
 *  other properties and the common labels. */
export function propertyLabelIssue(draft: TemplateDef, selfId: string | null, label: string): string | null {
  if (!label.trim()) return "This field is required";
  const taken = [
    ...COMMON_LABELS,
    ...draft.commonProperties.map((p) => p.label),
    ...draft.properties.filter((p) => p.id !== selfId).map((p) => p.label),
  ];
  return taken.some((l) => fold(l) === fold(label)) ? "This label already exists in this template" : null;
}

/** Uwazi's `safeName`: the metadata key a new property is stored under. Kept
 *  on rename (decision S4). */
export function safeName(label: string): string {
  return label.trim().replace(/[^a-z0-9]/gi, "_").toLowerCase() || "property";
}

/** The key for a new property: its safe name, or the name another template
 *  already gives that label (so the two combine in the Library), made unique
 *  in this template. A name a removed property of another type held is not
 *  reused either: its values stay in the records (removal is soft), and they
 *  would be read through the new type. A removed property of the same type
 *  gives its name back, and its values with it, as an undo would. */
export function newPropertyName(
  label: string,
  type: PropertyType,
  draft: TemplateDef,
  others: TemplateDef[],
  removed: PropertyDef[] = [],
): string {
  const shared = others
    .flatMap((t) => t.properties)
    .find((p) => fold(p.label) === fold(label))?.name;
  const base = shared ?? safeName(label);
  const taken = new Set([
    ...[...draft.commonProperties, ...draft.properties].map((p) => p.name),
    ...removed.filter((p) => p.type !== type).map((p) => p.name),
  ]);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/* ── Same label in other templates ────────────────────────────────────── */

export interface SameLabelRow {
  templateId: string;
  templateName: string;
  own: boolean;
  property: PropertyDef;
}

/** The property being edited, then every property with the same label
 *  (trimmed, case-insensitive): other templates as saved, the current one
 *  from the draft, so a property removed or renamed in the draft does not
 *  match (Uwazi reads the saved list for both). */
export function sameLabelRows(saved: TemplateDef[], draft: TemplateDef, prop: PropertyDef): SameLabelRow[] {
  const own: SameLabelRow = { templateId: draft.id, templateName: draft.name, own: true, property: prop };
  if (!prop.label.trim()) return [own];
  const matches = (p: PropertyDef) => p.id !== prop.id && fold(p.label) === fold(prop.label);
  const rows: SameLabelRow[] = [own];
  for (const t of [draft, ...saved.filter((x) => x.id !== draft.id)])
    for (const p of t.properties)
      if (matches(p)) rows.push({ templateId: t.id, templateName: t.name, own: t.id === draft.id, property: p });
  return rows;
}

export type MatchField = "type" | "thesaurus" | "relationType" | "entities" | "inherit";

/** The fields of `other` that differ from `prop`, by Uwazi's client rule:
 *  the type exactly; the thesaurus for selects; relation type, target
 *  template and inherit for relationships (empty and missing are equal). */
export function mismatches(prop: PropertyDef, other: PropertyDef): MatchField[] {
  const out: MatchField[] = [];
  const same = (a?: string, b?: string) => (a || "") === (b || "");
  if (other.type !== prop.type) out.push("type");
  if ((prop.type === "select" || prop.type === "multiselect") && !same(prop.content, other.content)) out.push("thesaurus");
  if (prop.type === "relationship") {
    if (!same(prop.relationType, other.relationType)) out.push("relationType");
    if (!same(prop.content, other.content)) out.push("entities");
    if (!same(prop.inherit?.property, other.inherit?.property) || !same(prop.inherit?.type, other.inherit?.type))
      out.push("inherit");
  }
  return out;
}

const FIELD_WORDS: Record<MatchField, string> = {
  type: "type",
  thesaurus: "thesaurus",
  relationType: "relationship type",
  entities: "entities",
  inherit: "inherited property",
};

/** The visible error line for an incompatible same-label property: the first
 *  conflicting template and the field that differs. Null when compatible.
 *  Only other templates count: a second property with the label in this
 *  template is the label rule's refusal ("already exists in this template"). */
export function sameLabelIssue(rows: SameLabelRow[]): string | null {
  const [own, ...others] = rows;
  for (const r of others) {
    if (r.own) continue;
    const diff = mismatches(own.property, r.property);
    if (diff.length)
      return `“${r.property.label}” in “${r.templateName}” has a different ${diff
        .map((d) => FIELD_WORDS[d])
        .join(" and ")}. Use the same, or another label.`;
  }
  return null;
}

/* ── Inheritance ──────────────────────────────────────────────────────── */

export interface Inheritor {
  templateName: string;
  label: string;
}

/** Properties of other templates that inherit `prop` of `templateId`: a
 *  relationship property that targets the template and inherits it by id,
 *  and a prototype chain field whose path ends on the template at it. */
export function inheritorsOf(templates: TemplateDef[], templateId: string, prop: PropertyDef): Inheritor[] {
  const out: Inheritor[] = [];
  for (const t of templates)
    for (const p of t.properties) {
      if (p.type !== "relationship") continue;
      const direct = p.content === templateId && p.inherit?.property === prop.id;
      const path = p.x?.inheritPath;
      const chain = !!path?.length && path[path.length - 1].toTypeId === templateId && p.x?.inheritLeaf === prop.name;
      if (direct || chain) out.push({ templateName: t.name, label: p.label });
    }
  return out;
}

/** Uwazi's server text for the refusal, with the names it lists. */
export const inheritedRefusal = (names: string[]) =>
  `Properties can not be deleted because are being inherited: [properties=${names.join(",")}]`;
