import type { Entity } from "../data/entities";
import type { Corpus } from "../data/entityOverlay";
import type { TemplateDef } from "../data/templates/types";
import { templatesMirror } from "../data/templates/mirror";
import type { ThesaurusValue } from "../data/settings";

/** Usage queries for Settings: what a template, property, thesaurus, value,
 *  relationship type, group, user or language is used by, and whether Uwazi
 *  refuses to delete it. Pure functions over the corpus's schema and
 *  entities; the selectors that feed them live in `atoms/settingsUsage.ts`.
 *
 *  Uwazi enforces its refusals on the server (inventory Part 0.8). The
 *  prototype has no server, so `block` is checked before the dialog opens
 *  and the dialog names the rule instead of a Delete button. */

/** One template property as the usage queries read it: the template store's
 *  `PropertyDef`, with a relationship's inherited property resolved to its
 *  name. */
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

/** A corpus's template properties, from the template store (step M8), so a
 *  property added, removed or rebound in Settings › Templates is what every
 *  usage query reads. Cached per template list: the store returns the same
 *  array until it changes. */
const schemaCache = new WeakMap<TemplateDef[], SchemaProperty[]>();
export function schemaFromTemplates(templates: TemplateDef[]): SchemaProperty[] {
  const hit = schemaCache.get(templates);
  if (hit) return hit;
  const byId = new Map(templates.map((t) => [t.id, t]));
  const out = templates.flatMap((t) =>
    t.properties.map((p) => {
      const sp: SchemaProperty = { templateId: t.id, name: p.name, label: p.label, type: p.type };
      if (p.type === "select" || p.type === "multiselect") sp.thesaurusId = p.content;
      if (p.type === "relationship") {
        sp.relationType = p.relationType;
        sp.targetTemplateId = p.content;
        if (p.inherit && p.content) {
          // Inheritance names the target property by id. CEJIL's dump drops
          // property ids, so there the target's only property of the
          // inherited type stands in for it.
          const target = byId.get(p.content)?.properties ?? [];
          const ofType = target.filter((x) => x.type === p.inherit!.type);
          const hit = target.find((x) => x.id === p.inherit!.property) ?? (ofType.length === 1 ? ofType[0] : undefined);
          if (hit) sp.inherits = hit.name;
        }
      }
      return sp;
    }),
  );
  schemaCache.set(templates, out);
  return out;
}

/** A corpus's template properties, outside an atom. */
export const schemaOf = (corpus: Corpus): SchemaProperty[] => schemaFromTemplates(templatesMirror(corpus));

export const foldName = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();

/** One value an entity holds for a property: the stored id where there is
 *  one (a thesaurus value, a connected entity), and its label. */
export interface HeldValue {
  id?: string;
  label: string;
}

/** Reads the values an entity holds for a property, empty ones left out.
 *  Each corpus reads its real record (`atoms/settingsUsage.ts`), never the
 *  search index, which leaves out hoisted and non-text properties. */
export type ValueReader = (e: Entity, p: SchemaProperty) => HeldValue[];

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
  const withValue = entities.filter((e) => read(e, p).length > 0).length;
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
    for (const e of entitiesOf(p.templateId)) if (read(e, p).length > 0) counted.add(e.id);
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
 *  properties. Matched by the value's id where the record stores one (CEJIL),
 *  else by its exact label (the Sample stores labels only). A label is never
 *  split: a label can contain ", ". */
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
  const ids = new Set([value.id, ...(value.values ?? []).map((c) => c.id)]);
  const labels = new Set(valueLabels(value).map(foldName).filter(Boolean));
  if (!labels.size && !value.id) return 0;
  const hit = new Set<string>();
  for (const p of properties)
    for (const e of entitiesOf(p.templateId))
      if (read(e, p).some((v) => (v.id ? ids.has(v.id) : labels.has(foldName(v.label))))) hit.add(e.id);
  return hit.size;
}

/* ── Relationship types ────────────────────────────────────────────────── */

export interface RelationTypeUsage extends Impact {
  references: number;
  /** Relationship fields that use it, as "Template › Property". */
  fields: string[];
  /** The templates those fields are on (Uwazi's Templates column). */
  templates: string[];
  /** The references can be moved to another type before the delete. */
  reassignable: boolean;
  /** The collection's references have not loaded: the count is unknown. */
  pending: boolean;
}

export function relationTypeUsage({
  id,
  references,
  schema,
  templateName,
  writable,
  pending = false,
}: {
  id: string;
  references: number;
  schema: SchemaProperty[];
  templateName: (id: string) => string;
  /** Whether this collection's references live in a store the prototype writes. */
  writable: boolean;
  /** The references have not loaded yet. */
  pending?: boolean;
}): RelationTypeUsage {
  const using = schema.filter((p) => p.relationType === id);
  const fields = using.map((p) => `${templateName(p.templateId)} › ${p.label}`);
  const templates = [...new Set(using.map((p) => templateName(p.templateId)))];
  const lines: string[] = [];
  if (pending) lines.push("Reference counts appear when the collection's records have loaded.");
  else if (references) lines.push(`${count(references, "reference uses", "references use")} this type.`);
  if (fields.length) lines.push(`Relationship ${fields.length === 1 ? "field" : "fields"}: ${nameList(fields)}.`);
  // DeleteRelationshipType.ts refuses, in this order, a type a template uses
  // and a type relationships use; the messages are Uwazi's. Operator's
  // decision: where the prototype can rewrite the references, they can be
  // moved to another type instead of refusing.
  const block = templates.length
    ? `Cannot delete type being used in templates: ${templates.join(", ")}`
    : pending
      ? "The collection's references are still loading, so whether they use this type is not known yet. Try again in a moment."
      : references && !writable
        ? "Cannot delete type being used in relationships"
        : null;
  return { references, fields, templates, reassignable: !block && references > 0, pending, lines, block };
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

/** The menu links (top level and in groups) that lead to a page: a URL
 *  `/page/<key>` or `/<lang>/page/<key>/…`, where the key is the page's id or
 *  one of its slugs. */
export function pageMenuLinks(
  keys: string[],
  menu: { title: string; url: string; sublinks?: { title: string; url: string }[] }[],
): { title: string; url: string }[] {
  const want = new Set(keys.filter(Boolean));
  const leads = (url: string) => {
    const m = url.match(/^(?:\/[a-z]{2})?\/page\/([^/?#]+)/);
    return !!m && want.has(m[1]);
  };
  return menu
    .flatMap((m) => [m, ...(m.sublinks ?? [])])
    .filter((m) => leads(m.url))
    .map(({ title, url }) => ({ title, url }));
}
