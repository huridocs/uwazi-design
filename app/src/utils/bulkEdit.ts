import type { Language } from "../atoms/language";
import { choiceByLanguage } from "../atoms/thesauri";
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
 *  place is a map, and the title is the entity's own. */
const EXCLUDED = new Set<MetadataField["type"]>(["file-list", "media"]);

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
    // A property whose RECORD is a different kind from its template's blank
    // field is one the form can't write faithfully: CEJIL's multidates are
    // text in the template table and a list of dates on the record, and one
    // box for all of them would overwrite every list with one string.
    .filter((f) =>
      entities.every((e) => {
        const r = (getEntityProfile(e.id).metadata[language] ?? []).find((x) => x.id === f.id);
        return !r || r.type === f.type;
      }),
    )
    .map((f) => ({ id: f.id, label: f.label, type: f.type, kind: kindOf(f.type), thesaurus: f.thesaurus }));

  const relOf = (id: string) =>
    (getEntityProfile(id).metadata[language] ?? []).filter(
      (f): f is RelationshipMetadataField =>
        f.type === "relationship" && !f.readOnly && !f.inheritProperty && !f.inheritPath?.length,
    );
  const firstRels = relOf(entities[0].id);
  const others = entities.slice(1).map((e) => relOf(e.id));
  const connections: BulkField[] = firstRels
    .filter((f) =>
      others.every((list) =>
        list.some((g) => g.id === f.id && g.relationType === f.relationType && g.targetTypeId === f.targetTypeId),
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

/** One entity's value for a field, as the form compares it: a string for a
 *  scalar or select, the set of labels / connected ids for a multi. */
export function valueOf(entityId: string, field: BulkField, language: Language): string | string[] {
  const f = (getEntityProfile(entityId).metadata[language] ?? []).find((x) => x.id === field.id);
  if (field.kind === "connection") return f?.type === "relationship" ? f.connectedEntityIds : [];
  if (!f || f.type === "relationship") return field.kind === "multi" ? [] : "";
  if (field.kind === "multi") return chosenLabels(f);
  return f.value ?? "";
}

export interface ScalarSummary {
  shared: boolean;
  value: string;
  distinct: number;
}

export function scalarSummary(ids: string[], field: BulkField, language: Language): ScalarSummary {
  const values = ids.map((id) => valueOf(id, field, language) as string);
  const distinct = new Set(values).size;
  return { shared: distinct <= 1, value: values[0] ?? "", distinct };
}

/** How many of the entities hold each label (or connected id). */
export function coverageOf(ids: string[], field: BulkField, language: Language): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of ids) for (const v of new Set(valueOf(id, field, language) as string[])) counts[v] = (counts[v] ?? 0) + 1;
  return counts;
}

/** An edit to one field. A scalar is its new value (a select's is its label);
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
 *  Text is written in the language being edited — Uwazi keeps prose per
 *  language. A date, a link, a select and a multiselect are the same value in
 *  every language, so they are written into all four; a thesaurus choice goes
 *  in by value id, in each language's label (see `choiceByLanguage`). */
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

  // Per field, the per-language form of each value the edit names.
  const labelForms = new Map<string, Map<string, { id: string | null; byLang: Record<Language, string> }>>();
  for (const f of editedFields) {
    if (f.kind !== "select" && f.kind !== "multi") continue;
    const e = edits[f.id];
    const labels = e.kind === "scalar" ? (e.value ? [e.value] : []) : [...e.add, ...e.remove];
    const m = new Map<string, { id: string | null; byLang: Record<Language, string> }>();
    for (const l of labels) {
      const { byLang, ids: vids } = choiceByLanguage([l], language, thesaurusOf(f), corpus);
      m.set(l, {
        id: vids[0],
        byLang: Object.fromEntries(LANGS.map((x) => [x, byLang[x][0]])) as Record<Language, string>,
      });
    }
    labelForms.set(f.id, m);
  }

  // Review lines.
  for (const f of editedFields) {
    const e = edits[f.id];
    if (e.kind === "scalar") {
      const changing = ids.filter((id) => valueOf(id, f, language) !== e.value).length;
      lines.push({ fieldId: f.id, label: f.label, change: `→ ${e.value || "(empty)"}`, entities: changing });
    } else {
      const cov = coverageOf(ids, f, language);
      for (const v of e.add) {
        const have = cov[v] ?? 0;
        lines.push({
          fieldId: f.id,
          label: f.label,
          change: `+ ${displayOf(f, v)}`,
          entities: ids.length - have,
          note: have ? `${have} already have it` : undefined,
        });
      }
      for (const v of e.remove) {
        const have = cov[v] ?? 0;
        removes += have;
        lines.push({ fieldId: f.id, label: f.label, change: `− ${displayOf(f, v)}`, entities: have, removes: have });
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
        const v = valueOf(id, f, language);
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
            const everyLanguage = f.type !== "text" && f.type !== "multiline";
            if (l !== language && !everyLanguage) continue;
            list = upsert(list, f, blank[l], (x) => ({ ...x, value: e.value }));
          } else if (f.kind === "select" && e.kind === "scalar") {
            const form = e.value ? labelForms.get(f.id)?.get(e.value) : undefined;
            list = upsert(list, f, blank[l], (x) => ({
              ...x,
              value: form ? form.byLang[l] : "",
              valueIds: form?.id ? [form.id] : undefined,
            }));
          } else if (f.kind === "multi" && e.kind === "multi") {
            const forms = labelForms.get(f.id)!;
            list = upsert(list, f, blank[l], (x) => {
              let labels = [...chosenLabels(x)];
              let vids = [...(x.valueIds ?? labels.map(() => ""))];
              const matches = (i: number, v: string) => {
                const form = forms.get(v)!;
                return (form.id && vids[i] === form.id) || labels[i] === form.byLang[l];
              };
              for (const v of e.remove) {
                const keep = labels.map((_, i) => !matches(i, v));
                labels = labels.filter((_, i) => keep[i]);
                vids = vids.filter((_, i) => keep[i]);
              }
              for (const v of e.add) {
                if (labels.some((_, i) => matches(i, v))) continue;
                const form = forms.get(v)!;
                labels.push(form.byLang[l]);
                vids.push(form.id ?? "");
              }
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

/** A connection row's label is the connected entity's title; a value's is itself. */
const displayOf = (f: BulkField, v: string) => (f.kind === "connection" ? getEntity(v)?.title ?? v : v);

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
