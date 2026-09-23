import type { Language } from "../atoms/language";
import { fieldKeys, isPseudoKey, labelForKey } from "../atoms/thesauri";
import { getEntity, type Entity } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";
import type { Corpus, EntityRecord } from "../data/entityOverlay";
import {
  chosenLabels,
  type AnyMetadataField,
  type MetadataField,
  type RelationshipMetadataField,
} from "../data/metadata";
import type { ThesaurusValue } from "../data/settings";
import { templateFields } from "./createEntity";
import { adapterPatch, changedFieldIds } from "./entityEdit";

/** Bulk edit — which properties a set of entities shares, what each holds, and
 *  what applying an edit to all of them writes. Pure: `BulkEditBody` renders
 *  it, `applyBulkEditAtom` writes it. */

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

export type BulkFieldKind = "scalar" | "select" | "multi" | "connection";

export interface BulkField {
  id: string;
  label: string;
  type: MetadataField["type"] | "relationship";
  kind: BulkFieldKind;
  thesaurus?: string;
  relationType?: string;
  targetTypeId?: string;
}

/** What never goes in a bulk form: files and recordings are per entity, a
 *  place is a map, the title is the entity's own, and a country is a name
 *  AND a flag per language that a text box can't keep in step. */
const EXCLUDED = new Set<MetadataField["type"]>(["file-list", "media", "country"]);

const kindOf = (t: MetadataField["type"]): BulkFieldKind =>
  t === "select" ? "select" : t === "multiselect" ? "multi" : "scalar";

/** The properties EVERY selected template has: same id, same type, and for a
 *  select the same thesaurus. In the first template's order. Plus the editable
 *  connections every selected entity carries (same relation and target), which
 *  a template table doesn't list in this prototype. */
export function commonFields(entities: Entity[], corpus: Corpus, language: Language): BulkField[] {
  if (entities.length === 0) return [];
  const typeIds = [...new Set(entities.map((e) => e.typeId))];
  const perTemplate = typeIds.map((t) => templateFields(t, corpus)[language] ?? []);
  const same = (a: MetadataField, b: MetadataField) =>
    a.id === b.id && a.type === b.type && (a.thesaurus ?? "") === (b.thesaurus ?? "");
  const scalars: BulkField[] = perTemplate[0]
    .filter((f) => !EXCLUDED.has(f.type) && !f.list && f.id !== "title" && f.id !== "geolocation")
    .filter((f) => perTemplate.every((list) => list.some((g) => same(f, g))))
    // Read off the TEMPLATE only — never every entity's record: opening the
    // form on a whole corpus built every CEJIL profile in one render. The one
    // template/record mismatch that matters (multidates, a list printed as
    // one string) is marked on the template's own field as `list`.
    .map((f) => ({ id: f.id, label: f.label, type: f.type, kind: kindOf(f.type), thesaurus: f.thesaurus }));

  const relOf = (id: string) =>
    (getEntityProfile(id).metadata[language] ?? []).filter(
      (f): f is RelationshipMetadataField =>
        f.type === "relationship" && !f.readOnly && !f.inheritProperty && !f.inheritPath?.length,
    );
  // Lazily, with an early exit: only when the first entity HAS an editable
  // connection are the others read, and each only until one lacks it. Reading
  // every entity's connections up front built 4,398 profiles to find none.
  const firstRels = relOf(entities[0].id);
  const connections: BulkField[] = firstRels
    .filter((f) =>
      entities
        .slice(1)
        .every((e) =>
          relOf(e.id).some((g) => g.id === f.id && g.relationType === f.relationType && g.targetTypeId === f.targetTypeId),
        ),
    )
    .map((f) => ({
      id: f.id,
      label: f.label,
      type: "relationship" as const,
      kind: "connection" as const,
      relationType: f.relationType,
      targetTypeId: f.targetTypeId,
    }));
  return [...scalars, ...connections];
}

/** What reading a thesaurus value needs: the corpus (for its translations)
 *  and the thesaurus a field is bound to. */
export interface BulkCtx {
  corpus: Corpus;
  thesaurusOf: (field: BulkField) => ThesaurusValue[] | null;
}

/** One entity's value for a field, as the form compares it: a string for a
 *  scalar, the value KEY for a select, the keys / connected ids for a multi.
 *  Thesaurus values compare by id (`fieldKeys`), never by label — two values
 *  can share one. */
export function valueOf(entityId: string, field: BulkField, language: Language, ctx: BulkCtx): string | string[] {
  const f = (getEntityProfile(entityId).metadata[language] ?? []).find((x) => x.id === field.id);
  if (field.kind === "connection") return f?.type === "relationship" ? f.connectedEntityIds : [];
  if (!f || f.type === "relationship") return field.kind === "multi" ? [] : "";
  if (field.kind === "multi" || field.kind === "select") {
    const keys = fieldKeys(f, ctx.thesaurusOf(field), ctx.corpus, language);
    return field.kind === "multi" ? keys : keys[0] ?? "";
  }
  return f.value ?? "";
}

export interface ScalarSummary {
  shared: boolean;
  value: string;
  distinct: number;
}

export function scalarSummary(ids: string[], field: BulkField, language: Language, ctx: BulkCtx): ScalarSummary {
  const values = ids.map((id) => valueOf(id, field, language, ctx) as string);
  const distinct = new Set(values).size;
  return { shared: distinct <= 1, value: values[0] ?? "", distinct };
}

/** How many of the entities hold each label (or connected id). */
export function coverageOf(ids: string[], field: BulkField, language: Language, ctx: BulkCtx): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of ids)
    for (const v of new Set(valueOf(id, field, language, ctx) as string[])) counts[v] = (counts[v] ?? 0) + 1;
  return counts;
}

/** What the selected entities hold for one field, accumulated: the distinct
 *  values of a scalar (and the first), and per-value counts of a multi. */
export interface FieldSummary {
  distinct: Set<string>;
  first?: string;
  counts: Record<string, number>;
}

/** Add `ids` to the running summaries — called on the whole set for a small
 *  selection, or chunk by chunk for a large one. */
export function summarizeInto(
  acc: Record<string, FieldSummary>,
  ids: string[],
  fields: BulkField[],
  language: Language,
  ctx: BulkCtx,
): Record<string, FieldSummary> {
  for (const f of fields) acc[f.id] ??= { distinct: new Set(), counts: {} };
  for (const id of ids)
    for (const f of fields) {
      const v = valueOf(id, f, language, ctx);
      const s = acc[f.id];
      if (Array.isArray(v)) for (const x of new Set(v)) s.counts[x] = (s.counts[x] ?? 0) + 1;
      else {
        if (s.first === undefined) s.first = v;
        s.distinct.add(v);
      }
    }
  return acc;
}

export const scalarOf = (s: FieldSummary): ScalarSummary => ({
  shared: s.distinct.size <= 1,
  value: s.first ?? "",
  distinct: s.distinct.size,
});

/** An edit to one field. A scalar is its new value (a select's is its KEY);
 *  a multi is what to add to all and what to remove from all — a row left
 *  mixed is in neither and is not written. */
export type BulkEdit = { kind: "scalar"; value: string } | { kind: "multi"; add: string[]; remove: string[] };
export type BulkEdits = Record<string, BulkEdit>;

export interface BulkLine {
  fieldId: string;
  label: string;
  /** "→ Closed", "+ Amnistía", "− ICCPR" */
  change: string;
  entities: number;
  note?: string;
  removes?: number;
}

export interface BulkPlan {
  records: Record<string, EntityRecord>;
  patches: Record<string, Partial<Entity>>;
  lines: BulkLine[];
  /** Values removed across all entities — the review's seal line. */
  removes: number;
  /** Entities any line actually changes. */
  touched: number;
}

/** What applying `edits` to `entities` writes: a record and (adapter corpora)
 *  an entity patch per entity that changes, and the review's lines.
 *
 *  Scalars — text, dates — are written in the language being edited only:
 *  the records hold them localised, and copying one language's string over
 *  another's is how "29 de julio de 1988" became "May 3, 1990". A link is the
 *  same address in every language. A select and a multiselect go into all
 *  four BY VALUE ID, each in its own language's label (`choiceByLanguage`). */
export function planBulkEdit({
  entities,
  fields,
  edits,
  language,
  corpus,
  thesaurusOf,
  withRecords = true,
}: {
  entities: Entity[];
  fields: BulkField[];
  edits: BulkEdits;
  language: Language;
  corpus: Corpus;
  thesaurusOf: (field: BulkField) => ThesaurusValue[] | null;
  /** false: the review's counts only, no records — for a set big enough that
   *  Apply runs as a task and builds them chunk by chunk. */
  withRecords?: boolean;
}): BulkPlan {
  const ids = entities.map((e) => e.id);
  const lines: BulkLine[] = [];
  let removes = 0;
  const editedFields = fields.filter((f) => edits[f.id]);

  const ctx: BulkCtx = { corpus, thesaurusOf };
  const labelOf = (f: BulkField, key: string) =>
    f.kind === "connection" ? getEntity(key)?.title ?? key : labelForKey(key, thesaurusOf(f), corpus, language);

  // Review lines.
  for (const f of editedFields) {
    const e = edits[f.id];
    if (e.kind === "scalar") {
      const changing = ids.filter((id) => valueOf(id, f, language, ctx) !== e.value).length;
      const shown = f.kind === "select" && e.value ? labelOf(f, e.value) : e.value;
      lines.push({ fieldId: f.id, label: f.label, change: `→ ${shown || "(empty)"}`, entities: changing });
    } else {
      const cov = coverageOf(ids, f, language, ctx);
      for (const v of e.add) {
        const have = cov[v] ?? 0;
        lines.push({
          fieldId: f.id,
          label: f.label,
          change: `+ ${labelOf(f, v)}`,
          entities: ids.length - have,
          note: have ? `${have} already have it` : undefined,
        });
      }
      for (const v of e.remove) {
        const have = cov[v] ?? 0;
        removes += have;
        lines.push({ fieldId: f.id, label: f.label, change: `− ${labelOf(f, v)}`, entities: have, removes: have });
      }
    }
  }

  if (!withRecords) {
    // Which entities a line changes, read in the edited language — the same
    // test the counts above make, per entity.
    let touched = 0;
    for (const id of ids) {
      const hit = editedFields.some((f) => {
        const e = edits[f.id];
        const v = valueOf(id, f, language, ctx);
        if (e.kind === "scalar") return v !== e.value;
        const held = new Set(v as string[]);
        return e.add.some((x) => !held.has(x)) || e.remove.some((x) => held.has(x));
      });
      if (hit) touched++;
    }
    return { records: {}, patches: {}, lines, removes, touched };
  }

  // Records.
  const records: Record<string, EntityRecord> = {};
  const patches: Record<string, Partial<Entity>> = {};
  const cardLang: Language = corpus === "cejil" ? "ES" : language;
  for (const entity of entities) {
    const profile = getEntityProfile(entity.id);
    const blank = templateFields(entity.typeId, corpus);
    const metadata = Object.fromEntries(
      LANGS.map((l) => {
        let list: AnyMetadataField[] = [...(profile.metadata[l] ?? [])];
        for (const f of editedFields) {
          const e = edits[f.id];
          if (f.kind === "scalar" && e.kind === "scalar") {
            // Text, dates and every other scalar are LOCALISED on the record
            // ("July 29, 1988" / "29 de julio de 1988"), so they are written
            // in the edited language only — a value in one language is never
            // copied over another's. A link is an address, the same in all.
            if (l !== language && f.type !== "link") continue;
            list = upsert(list, f, blank[l], (x) => ({ ...x, value: e.value }));
          } else if (f.kind === "select" && e.kind === "scalar") {
            const thes = thesaurusOf(f);
            list = upsert(list, f, blank[l], (x) => ({
              ...x,
              value: e.value ? labelForKey(e.value, thes, corpus, l) : "",
              valueIds: e.value && !isPseudoKey(e.value) ? [e.value] : undefined,
            }));
          } else if (f.kind === "multi" && e.kind === "multi") {
            const thes = thesaurusOf(f);
            list = upsert(list, f, blank[l], (x) => {
              // Each held value as its KEY in this language, beside its label.
              let keys = fieldKeys(x, thes, corpus, l);
              let labels = [...chosenLabels(x)];
              const drop = new Set(e.remove);
              const keep = keys.map((k) => !drop.has(k));
              keys = keys.filter((_, i) => keep[i]);
              labels = labels.filter((_, i) => keep[i]);
              for (const k of e.add) {
                if (keys.includes(k)) continue;
                keys.push(k);
                labels.push(labelForKey(k, thes, corpus, l));
              }
              const vids = keys.map((k) => (isPseudoKey(k) ? "" : k));
              return {
                ...x,
                values: labels,
                value: labels.join(", "),
                valueIds: vids.some(Boolean) ? vids : undefined,
              };
            });
          } else if (f.kind === "connection" && e.kind === "multi") {
            list = list.map((x) => {
              if (x.id !== f.id || x.type !== "relationship") return x;
              const drop = new Set(e.remove);
              const next = x.connectedEntityIds.filter((id) => !drop.has(id));
              for (const id of e.add) if (!next.includes(id)) next.push(id);
              return { ...x, connectedEntityIds: next };
            });
          }
        }
        return [l, list];
      }),
    ) as Record<Language, AnyMetadataField[]>;

    const moved = LANGS.some((l) => changedFieldIds(profile.metadata[l] ?? [], metadata[l]).size > 0) ||
      editedFields.some((f) => f.kind === "connection" && connectionMoved(profile.metadata[language], metadata[language], f.id));
    if (!moved) continue;
    records[entity.id] = { typeId: profile.typeId, metadata };
    patches[entity.id] =
      corpus === "mock"
        ? {}
        : adapterPatch(entity, metadata[cardLang], changedFieldIds(profile.metadata[cardLang] ?? [], metadata[cardLang]));
  }

  return { records, patches, lines, removes, touched: Object.keys(records).length };
}

function connectionMoved(before: AnyMetadataField[] = [], after: AnyMetadataField[] = [], id: string) {
  const a = before.find((f) => f.id === id);
  const b = after.find((f) => f.id === id);
  return (
    a?.type === "relationship" &&
    b?.type === "relationship" &&
    a.connectedEntityIds.join("|") !== b.connectedEntityIds.join("|")
  );
}

/** Change field `f` in `list`, creating it from the template's blank field
 *  when this entity's record doesn't hold it yet (a CEJIL record lists only
 *  properties with a value). */
function upsert(
  list: AnyMetadataField[],
  f: BulkField,
  blank: MetadataField[] | undefined,
  change: (x: MetadataField) => MetadataField,
): AnyMetadataField[] {
  const i = list.findIndex((x) => x.id === f.id && x.type !== "relationship");
  if (i >= 0) {
    const next = [...list];
    next[i] = change(list[i] as MetadataField);
    return next;
  }
  const seed = blank?.find((x) => x.id === f.id) ?? { id: f.id, label: f.label, type: f.type as MetadataField["type"], value: "" };
  const made = change({ ...seed, thesaurus: seed.thesaurus ?? f.thesaurus });
  return made.value || made.values?.length ? [...list, made] : list;
}
