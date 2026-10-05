import type { Entity } from "../data/entities";
import type { Corpus } from "../data/entityChanges";
import { cejilTemplates } from "../data/cejil/templates";
import { travesiaTemplates } from "../data/travesia/schema";
import { sampleTemplateProperties } from "../data/entityProfiles";
import { relationshipFieldsByLanguage } from "../data/metadata";
import type { ThesaurusValue } from "../data/settings";

/** Usage queries for Settings: what a template, property, thesaurus, value,
 *  relationship type, group, user or language is used by, and whether Uwazi
 *  refuses to delete it. Pure functions over the corpus's schema and
 *  entities; the selectors that feed them live in `atoms/settingsUsage.ts`.
 *
 *  Uwazi enforces its refusals on the server (inventory Part 0.8). The
 *  prototype has no server, so `block` is checked before the dialog opens
 *  and the dialog names the rule instead of a Delete button. */

/** One template property as the usage queries read it, whatever the corpus's
 *  own shape: CEJIL and Travesía ship Uwazi templates, the Sample has its
 *  field table (`data/entityProfiles.ts`) and the case's relationship fields. */
export interface SchemaProperty {
  templateId: string;
  /** Uwazi's property `name`; the Sample's property key. */
  name: string;
  label: string;
  type: string;
  thesaurusId?: string;
  relationType?: string;
  /** relationship: the template it links to. */
  targetTemplateId?: string;
  /** relationship: the target template's property it inherits, by name. */
  inherits?: string;
}

type UwaziProperty = {
  _id?: string;
  name: string;
  label: string;
  type: string;
  content?: string;
  relationType?: string;
  inherit?: { property: string; type: string };
};
type UwaziTemplate = { _id: string; name: string; properties: UwaziProperty[]; commonProperties?: UwaziProperty[] };

function fromUwazi(templates: UwaziTemplate[]): SchemaProperty[] {
  const byId = new Map(templates.map((t) => [t._id, t]));
  return templates.flatMap((t) =>
    t.properties.map((p) => {
      const out: SchemaProperty = { templateId: t._id, name: p.name, label: p.label, type: p.type };
      if (p.type === "select" || p.type === "multiselect") out.thesaurusId = p.content;
      if (p.type === "relationship") {
        out.relationType = p.relationType;
        out.targetTemplateId = p.content;
        if (p.inherit && p.content) {
          // Inheritance names the target property by `_id`. CEJIL's dump drops
          // property ids, so there the target's only property of the inherited
          // type stands in for it.
          const target = byId.get(p.content)?.properties ?? [];
          const hit =
            target.find((x) => x._id === p.inherit!.property) ??
            (target.filter((x) => x.type === p.inherit!.type).length === 1
              ? target.find((x) => x.type === p.inherit!.type)
              : undefined);
          if (hit) out.inherits = hit.name;
        }
      }
      return out;
    }),
  );
}

/** The Sample's schema: its field table, plus the relationship fields the
 *  case record carries (`data/metadata.ts`), which belong to Court case. */
function sampleSchema(): SchemaProperty[] {
  const fields: SchemaProperty[] = sampleTemplateProperties().map((p) => ({
    templateId: p.typeId,
    name: p.prop,
    label: p.label,
    type: p.type,
    thesaurusId: p.thesaurus,
  }));
  const rels: SchemaProperty[] = relationshipFieldsByLanguage.EN.map((f) => ({
    templateId: "court_case",
    name: f.id,
    label: f.label,
    type: "relationship",
    relationType: f.relationType,
    targetTemplateId: f.targetTypeId,
    inherits: f.inheritProperty,
  }));
  return [...fields, ...rels];
}

const schemaCache = new Map<Corpus, SchemaProperty[]>();
/** A corpus's template properties. The artworks corpus shows the Sample's
 *  configuration in Settings, so it reads the Sample's schema. */
export function schemaOf(corpus: Corpus): SchemaProperty[] {
  let s = schemaCache.get(corpus);
  if (!s) {
    s =
      corpus === "cejil"
        ? fromUwazi(cejilTemplates as UwaziTemplate[])
        : corpus === "travesia"
          ? fromUwazi(travesiaTemplates as UwaziTemplate[])
          : sampleSchema();
    schemaCache.set(corpus, s);
  }
  return s;
}

export const foldName = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();

/** Reads the values an entity holds for a property. The Sample keeps native
 *  props by key; the imported corpora carry `searchFields` keyed by name. */
export type ValueReader = (e: Entity, p: SchemaProperty) => string[];

/** "1 entity", "412 entities". */
export const count = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** "A", "A and B", "A, B and 3 more". */
export function nameList(names: string[], max = 3): string {
  const u = [...new Set(names)];
  if (u.length <= 1) return u[0] ?? "";
  if (u.length <= max) return `${u.slice(0, -1).join(", ")} and ${u[u.length - 1]}`;
  return `${u.slice(0, max).join(", ")} and ${u.length - max} more`;
}

/** What a delete would touch, and whether Uwazi refuses it. `lines` are the
 *  facts the dialog lists; `block` is the rule that stops the delete. */
export interface Impact {
  lines: string[];
  block: string | null;
}

/* ── Templates ─────────────────────────────────────────────────────────── */

export interface TemplateUsage extends Impact {
  entities: number;
  /** Other templates with a relationship property that links to this one. */
  linkedFrom: string[];
}

export function templateUsage({
  templateId,
  isDefault,
  entities,
  schema,
  templateName,
}: {
  templateId: string;
  isDefault: boolean;
  entities: number;
  schema: SchemaProperty[];
  templateName: (id: string) => string;
}): TemplateUsage {
  const linkedFrom = schema
    .filter((p) => p.type === "relationship" && p.targetTemplateId === templateId && p.templateId !== templateId)
    .map((p) => templateName(p.templateId));
  const lines: string[] = [];
  if (entities > 0) lines.push(`Used by ${count(entities, "entity", "entities")}.`);
  if (linkedFrom.length)
    lines.push(`Relationship properties in ${nameList(linkedFrom)} link to it. They are not changed.`);
  // DeleteTemplate.ts: the default template and a template with entities
  // are refused.
  const block = isDefault
    ? "This is the default template. Set another template as default first."
    : entities > 0
      ? `${count(entities, "entity uses", "entities use")} this template. Move or delete them first.`
      : null;
  return { entities, linkedFrom, lines, block };
}

/* ── Template properties ───────────────────────────────────────────────── */

export interface PropertyUsage extends Impact {
  /** Entities of the template holding a value for it. */
  entities: number;
  /** Templates that inherit it through a relationship property. */
  inheritedBy: string[];
}

/** Find a property of `templateId` by name or, failing that, by label: the
 *  Template editor's Sample list names properties differently from the
 *  record's field table (Review B6). */
export function findProperty(schema: SchemaProperty[], templateId: string, prop: { name?: string; label: string }) {
  const own = schema.filter((p) => p.templateId === templateId);
  return (
    (prop.name ? own.find((p) => p.name === prop.name) : undefined) ??
    own.find((p) => foldName(p.label) === foldName(prop.label))
  );
}

export function propertyUsage({
  templateId,
  prop,
  schema,
  entities,
  read,
  templateName,
}: {
  templateId: string;
  prop: { name?: string; label: string };
  schema: SchemaProperty[];
  /** The template's entities. */
  entities: Entity[];
  read: ValueReader;
  templateName: (id: string) => string;
}): PropertyUsage {
  const p = findProperty(schema, templateId, prop);
  if (!p) return { entities: 0, inheritedBy: [], lines: [], block: null };
  const withValue = entities.filter((e) => read(e, p).some((v) => v.trim() !== "")).length;
  const inheritedBy = schema
    .filter((x) => x.targetTemplateId === templateId && x.inherits === p.name)
    .map((x) => templateName(x.templateId));
  const lines = withValue ? [`${count(withValue, "entity holds", "entities hold")} a value for it.`] : [];
  // UpdateTemplate.ts: a property another template inherits is refused.
  const block = inheritedBy.length
    ? `${nameList(inheritedBy)} inherit${inheritedBy.length === 1 ? "s" : ""} this property. Remove the inheritance there first.`
    : null;
  return { entities: withValue, inheritedBy, lines, block };
}

/* ── Thesauri and values ───────────────────────────────────────────────── */

export interface ThesaurusUsage extends Impact {
  /** The properties bound to it, as "Template › Property". */
  properties: SchemaProperty[];
  templates: string[];
  entities: number;
}

/** Properties bound to a thesaurus: the schema's, plus links made in this
 *  session (`thesaurusBindingsAtom`, keyed `typeId:propertyId`). */
export function boundProperties(
  schema: SchemaProperty[],
  thesaurusId: string,
  bindings: Record<string, string>,
): SchemaProperty[] {
  const out = schema.filter((p) => {
    const bound = bindings[`${p.templateId}:${p.name}`];
    return (bound ?? p.thesaurusId) === thesaurusId;
  });
  for (const [key, id] of Object.entries(bindings)) {
    if (id !== thesaurusId) continue;
    const [templateId, name] = key.split(":");
    if (!out.some((p) => p.templateId === templateId && p.name === name))
      out.push({ templateId, name, label: name, type: "select", thesaurusId });
  }
  return out;
}

export function thesaurusUsage({
  properties,
  entitiesOf,
  read,
  templateName,
}: {
  properties: SchemaProperty[];
  entitiesOf: (templateId: string) => Entity[];
  read: ValueReader;
  templateName: (id: string) => string;
}): ThesaurusUsage {
  const templates = [...new Set(properties.map((p) => templateName(p.templateId)))];
  const counted = new Set<string>();
  for (const p of properties)
    for (const e of entitiesOf(p.templateId)) if (read(e, p).some((v) => v.trim())) counted.add(e.id);
  const lines: string[] = [];
  if (properties.length)
    lines.push(`Used by ${count(properties.length, "property", "properties")} in ${count(templates.length, "template")}: ${nameList(properties.map((p) => p.label))}.`);
  if (counted.size) lines.push(`${count(counted.size, "entity holds", "entities hold")} one of its values.`);
  // DeleteThesaurus.ts: refused while a template uses it.
  const block = properties.length
    ? `${nameList(templates)} use${templates.length === 1 ? "s" : ""} this thesaurus. Unlink ${properties.length === 1 ? "that property" : "those properties"} first.`
    : null;
  return { properties, templates, entities: counted.size, lines, block };
}

/** Labels a value stands for: itself, or a group's children. */
export const valueLabels = (v: ThesaurusValue): string[] => (v.values ? v.values.map((c) => c.label) : [v.label]);

/** Entities holding a value (or any child of a group), across the bound
 *  properties. Matched by label: the imported corpora's search fields carry
 *  labels, and the Sample stores labels only. */
export function valueUsage({
  value,
  properties,
  entitiesOf,
  read,
}: {
  value: ThesaurusValue;
  properties: SchemaProperty[];
  entitiesOf: (templateId: string) => Entity[];
  read: ValueReader;
}): number {
  const want = new Set(valueLabels(value).map(foldName).filter(Boolean));
  if (!want.size) return 0;
  const hit = new Set<string>();
  for (const p of properties)
    for (const e of entitiesOf(p.templateId))
      if (read(e, p).some((v) => v.split(", ").some((x) => want.has(foldName(x))))) hit.add(e.id);
  return hit.size;
}

/* ── Relationship types ────────────────────────────────────────────────── */

export interface RelationTypeUsage extends Impact {
  references: number;
  /** Relationship properties that use it, as "Template › Property". */
  fields: string[];
  /** The references can be moved to another type before the delete. */
  reassignable: boolean;
}

export function relationTypeUsage({
  registryId,
  references,
  schema,
  templateName,
  writable,
}: {
  /** The type's id where references and fields name it. */
  registryId: string | undefined;
  references: number;
  schema: SchemaProperty[];
  templateName: (id: string) => string;
  /** Whether this corpus's references live in a store the prototype writes. */
  writable: boolean;
}): RelationTypeUsage {
  const fields = registryId
    ? schema.filter((p) => p.relationType === registryId).map((p) => `${templateName(p.templateId)} › ${p.label}`)
    : [];
  const lines: string[] = [];
  if (references) lines.push(`${count(references, "reference uses", "references use")} this type.`);
  if (fields.length) lines.push(`Relationship ${fields.length === 1 ? "field" : "fields"}: ${nameList(fields)}.`);
  // DeleteRelationshipType.ts refuses a type that a template or a reference
  // uses. Juan's decision: the references can be moved to another type in the
  // dialog instead; a template's field still refuses.
  const block = fields.length
    ? `A relationship field uses this type. Change ${fields.length === 1 ? "that field" : "those fields"} first.`
    : references && !writable
      ? `${count(references, "reference uses", "references use")} this type, and this collection's references are read-only in the prototype.`
      : null;
  return { references, fields, reassignable: !block && references > 0, lines, block };
}

/* ── Users and groups ──────────────────────────────────────────────────── */

export function groupUsage({ members, shares }: { members: string[]; shares: number }): Impact {
  const lines: string[] = [];
  if (members.length) lines.push(`${count(members.length, "member loses", "members lose")} this group: ${nameList(members)}.`);
  if (shares) lines.push(`Shared with ${count(shares, "entity", "entities")}. That access is removed.`);
  return { lines, block: null };
}

export function userUsage({ block, groups, shares }: { block: string | null; groups: string[]; shares: number }): Impact {
  const lines: string[] = [];
  if (groups.length) lines.push(`Member of ${nameList(groups)}.`);
  if (shares) lines.push(`Shared with ${count(shares, "entity", "entities")}. That access is removed.`);
  return { lines, block };
}

/* ── Languages ─────────────────────────────────────────────────────────── */

export function languageUsage({
  isDefault,
  entities,
  translated,
}: {
  isDefault: boolean;
  /** Entities with a version in the language. */
  entities: number;
  /** Interface translation coverage, percent. */
  translated: number;
}): Impact {
  const lines: string[] = [];
  if (entities) lines.push(`${count(entities, "entity has", "entities have")} a version in this language.`);
  lines.push(`Interface translated: ${translated}%.`);
  const block = isDefault ? "This is the default language. Set another default first." : null;
  return { lines, block };
}

/* ── Pages ─────────────────────────────────────────────────────────────── */

export function pageUsage({ slug, menu }: { slug: string; menu: { title: string; url: string }[] }): Impact {
  const links = menu.filter((m) => m.url.replace(/\/$/, "") === `/page/${slug}`).map((m) => m.title);
  return {
    lines: links.length ? [`Linked from the menu: ${nameList(links)}. The ${links.length === 1 ? "link stays and" : "links stay and"} will lead nowhere.`] : [],
    block: null,
  };
}
