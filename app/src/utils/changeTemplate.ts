import type { Language } from "../atoms/language";
import type { Entity } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";
import type { Corpus, EntityRecord } from "../data/entityOverlay";
import { chosenLabels, type AnyMetadataField, type MetadataField } from "../data/metadata";
import { templateFields } from "./createEntity";

/** Change template — what moving entities to another template keeps, drops
 *  and adds, and the records that move writes. Pure; the dialog renders the
 *  plan and the Library writes the records through the overlay.
 *
 *  A property is KEPT when the target template has one with the same name and
 *  type (and, for a select, the same thesaurus). Anything else on the source
 *  is DROPPED, with its values; anything only the target has is NEW, empty.
 *  Title, dates, files and connections always stay. */

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

const sameProperty = (a: MetadataField, b: MetadataField) =>
  a.id === b.id && a.type === b.type && (a.thesaurus ?? "") === (b.thesaurus ?? "");

const hasValue = (f: AnyMetadataField) =>
  f.type !== "relationship" && (!!f.value?.trim() || !!chosenLabels(f).length);

export interface SourceBlock {
  typeId: string;
  count: number;
  kept: string[];
  dropped: { id: string; label: string; values: number; entities: number }[];
  added: string[];
}

export interface TemplateChangePlan {
  /** Entities that will change (not already on the target). */
  changing: Entity[];
  /** Already on the target, skipped. */
  skipped: number;
  sources: SourceBlock[];
  /** Values deleted, across all sources, and on how many entities. */
  dropValues: number;
  dropEntities: number;
}

export function planTemplateChange(
  entities: Entity[],
  target: string,
  corpus: Corpus,
  language: Language,
): TemplateChangePlan {
  const changing = entities.filter((e) => e.typeId !== target);
  const targetFields = templateFields(target, corpus)[language] ?? [];
  const bySource = new Map<string, Entity[]>();
  for (const e of changing) bySource.set(e.typeId, [...(bySource.get(e.typeId) ?? []), e]);
  const hit = new Set<string>();
  let dropValues = 0;
  const sources: SourceBlock[] = [...bySource].map(([typeId, list]) => {
    const src = templateFields(typeId, corpus)[language] ?? [];
    const kept = src.filter((f) => targetFields.some((g) => sameProperty(f, g)));
    const dropped = src
      .filter((f) => !kept.includes(f))
      .map((f) => {
        let values = 0;
        let ents = 0;
        for (const e of list) {
          const r = (getEntityProfile(e.id).metadata[language] ?? []).find((x) => x.id === f.id);
          if (r && hasValue(r)) {
            values += r.type === "relationship" ? 0 : Math.max(1, chosenLabels(r).length);
            ents++;
            hit.add(e.id);
          }
        }
        dropValues += values;
        return { id: f.id, label: f.label, values, entities: ents };
      });
    // A record can hold scalars its template doesn't declare (CEJIL records
    // do); the rebuilt record drops them too, so they are counted too.
    const declared = new Set(src.map((f) => f.id));
    const undeclared = new Map<string, { id: string; label: string; values: number; entities: number }>();
    for (const e of list)
      for (const r of getEntityProfile(e.id).metadata[language] ?? []) {
        if (r.type === "relationship" || declared.has(r.id) || r.id === "description" || !hasValue(r)) continue;
        const d = undeclared.get(r.id) ?? { id: r.id, label: r.label, values: 0, entities: 0 };
        d.values += Math.max(1, chosenLabels(r).length);
        d.entities++;
        hit.add(e.id);
        undeclared.set(r.id, d);
      }
    for (const d of undeclared.values()) {
      dropValues += d.values;
      dropped.push(d);
    }
    const added = targetFields.filter((g) => !src.some((f) => sameProperty(f, g))).map((g) => g.label);
    return { typeId, count: list.length, kept: kept.map((f) => f.label), dropped, added };
  });
  return { changing, skipped: entities.length - changing.length, sources, dropValues, dropEntities: hit.size };
}

/** The records (and adapter patches) moving `entities` to `target` writes. */
export function templateChangeRecords(
  entities: Entity[],
  target: string,
  corpus: Corpus,
): { records: Record<string, EntityRecord>; patches: Record<string, Partial<Entity>> } {
  const blank = templateFields(target, corpus);
  const records: Record<string, EntityRecord> = {};
  const patches: Record<string, Partial<Entity>> = {};
  for (const e of entities) {
    if (e.typeId === target) continue;
    const profile = getEntityProfile(e.id);
    const kept = new Set<string>();
    const sourceFields = templateFields(e.typeId, corpus);
    const metadata = Object.fromEntries(
      LANGS.map((l) => {
        const old = profile.metadata[l] ?? [];
        const fields: AnyMetadataField[] = (blank[l] ?? []).map((b) => {
          const prev = old.find((f): f is MetadataField => f.type !== "relationship" && sameProperty(f, b));
          if (prev) kept.add(prev.id);
          return prev ?? b;
        });
        // Always kept: connections, and the description the form keeps fixed.
        for (const f of old)
          if (f.type === "relationship" || (f.id === "description" && !fields.some((x) => x.id === f.id)))
            fields.push(f);
        return [l, fields];
      }),
    ) as Record<Language, AnyMetadataField[]>;
    records[e.id] = { typeId: target, metadata };
    const patch: Partial<Entity> = { typeId: target };
    if (corpus !== "mock") {
      // The adapter's card, search text and descriptor facet were built for
      // the OLD template: what was dropped leaves them. Only the source's own
      // scalar properties can be dropped — connections always stay.
      const dropped = new Set(
        (sourceFields.ES ?? sourceFields.EN ?? []).map((f) => f.id).filter((id) => !kept.has(id)),
      );
      if (e.fields) patch.fields = e.fields.filter((c) => !c.key || !dropped.has(c.key));
      if (e.searchFields) patch.searchFields = e.searchFields.filter((x) => !x.key || !dropped.has(x.key));
      if (e.descriptors?.length && dropped.has("descriptores")) patch.descriptors = [];
    }
    patches[e.id] = patch;
  }
  return { records, patches };
}
