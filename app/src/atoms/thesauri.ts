import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import { seedThesauri, seedThesaurusValues, type SettingsThesaurus, type ThesaurusValue } from "../data/settings";
import { cejilSettingsThesauri, cejilThesaurusValues } from "../data/cejil/settingsAdapt";
import type { Corpus } from "../data/entityOverlay";
import { dataSourceAtom, travesiaReadyAtom } from "./dataSource";
import { travesiaSettingsThesauri } from "../data/travesia/load";
import { cejilValueLabels } from "../data/cejil/profile";
import type { Language } from "./language";

/** The thesauri — ONE store that Settings › Thesauri, the edit form's
 *  thesaurus picker and anything else reading a vocabulary share. Before it,
 *  `ThesauriPage` held its list in local state, so a value added anywhere else
 *  could not reach Settings, and Settings' own saves reached nothing.
 *
 *  Kept the way the entity overlay is (`atoms/entityOverlay.ts`): the seeds
 *  are static imports, so the session's CHANGES live here, per corpus, and the
 *  list every reader sees is the seed with them applied.
 *   - `created` — thesauri that did not exist (Settings' Add, the form's
 *     "New thesaurus");
 *   - `values` — a thesaurus's value list, replaced whole on each write (a
 *     value added in the form, or the Settings editor's Save);
 *   - `renamed`, `deleted`;
 *   - `bindings` — a template property linked to a thesaurus in this session,
 *     keyed `typeId:propertyId`. The form's "New thesaurus" writes one: the
 *     property had nothing to pick from, and now it has. */
export interface ThesaurusRecord extends SettingsThesaurus {
  values: ThesaurusValue[];
}

interface CorpusThesauri {
  created: ThesaurusRecord[];
  values: Record<string, ThesaurusValue[]>;
  renamed: Record<string, string>;
  deleted: string[];
  bindings: Record<string, string>;
}

const EMPTY: CorpusThesauri = { created: [], values: {}, renamed: {}, deleted: [], bindings: {} };

const overlayAtom = atom<Record<Corpus, CorpusThesauri>>({ mock: EMPTY, cejil: EMPTY, artworks: EMPTY, travesia: EMPTY });

/** Values a list holds, groups counted beside their children — the count
 *  Settings has always shown ("Groups count as items alongside their
 *  children"). */
export const countValues = (values: ThesaurusValue[]) =>
  values.reduce((n, v) => n + 1 + (v.values?.length ?? 0), 0);

/** The seed a corpus starts from. The artworks corpus has no thesauri of its
 *  own and has always shown the Sample's in Settings. */
function seedOf(corpus: Corpus): { list: SettingsThesaurus[]; values: Record<string, ThesaurusValue[]> } {
  if (corpus === "cejil") return { list: cejilSettingsThesauri, values: cejilThesaurusValues };
  // Travesía's thesauri arrive with its entities (empty until then).
  if (corpus === "travesia") return travesiaSettingsThesauri();
  return { list: seedThesauri, values: seedThesaurusValues };
}

/** A corpus's thesauri, seed plus the session's changes. The Sample seed's
 *  `itemCount` counts more values than the prototype carries, so a seed
 *  thesaurus's count moves by what was added rather than being recounted. */
export const thesauriAtom = atomFamily((corpus: Corpus) =>
  atom<ThesaurusRecord[]>((get) => {
    // A lazily loaded corpus's seed appears on load: recompute then.
    if (corpus === "travesia") get(travesiaReadyAtom);
    const o = get(overlayAtom)[corpus];
    const seed = seedOf(corpus);
    const deleted = new Set(o.deleted);
    const fromSeed = seed.list
      .filter((t) => !deleted.has(t.id))
      .map((t) => {
        const seedValues = seed.values[t.id] ?? [];
        const values = o.values[t.id] ?? seedValues;
        return {
          ...t,
          name: o.renamed[t.id] ?? t.name,
          itemCount: Math.max(0, t.itemCount + countValues(values) - countValues(seedValues)),
          values,
        };
      });
    const created = o.created
      .filter((t) => !deleted.has(t.id))
      .map((t) => {
        const values = o.values[t.id] ?? t.values;
        return { ...t, name: o.renamed[t.id] ?? t.name, itemCount: countValues(values), values };
      });
    return [...fromSeed, ...created];
  }),
);

/** The thesauri of the collection the Library is showing. */
export const activeThesauriAtom = atom((get) => get(thesauriAtom(get(dataSourceAtom))));

/** Property → thesaurus links made in this session, for one corpus. */
export const thesaurusBindingsAtom = atomFamily((corpus: Corpus) =>
  atom((get) => get(overlayAtom)[corpus].bindings),
);

export const bindingKey = (typeId: string, propertyId: string) => `${typeId}:${propertyId}`;

function update(
  prev: Record<Corpus, CorpusThesauri>,
  corpus: Corpus,
  change: (o: CorpusThesauri) => CorpusThesauri,
): Record<Corpus, CorpusThesauri> {
  return { ...prev, [corpus]: change(prev[corpus]) };
}

let seq = 0;
const newId = (prefix: string) => {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
};

/** Fold for comparing labels: case and accents ignored, so "amnistia" is the
 *  value "Amnistía" and not a second one. */
export const foldLabel = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();

/** Every selectable label in a list — groups hold values, they are not one. */
export const selectableLabels = (values: ThesaurusValue[]): string[] =>
  values.flatMap((v) => (v.values ? v.values.map((c) => c.label) : [v.label]));

/** Add one value at the ROOT of a thesaurus (moving it into a group is done in
 *  Settings). A label that folds to an existing selectable value adds nothing
 *  and returns that value's own label, so the caller ticks what exists. */
export const addThesaurusValueAtom = atom(
  null,
  (
    get,
    set,
    { corpus, thesaurusId, label }: { corpus: Corpus; thesaurusId: string; label: string },
  ): { id: string | null; label: string } => {
    const t = get(thesauriAtom(corpus)).find((x) => x.id === thesaurusId);
    const clean = label.trim();
    if (!t || !clean) return { id: null, label: clean };
    for (const v of t.values)
      for (const x of v.values ?? [v]) if (foldLabel(x.label) === foldLabel(clean)) return { id: x.id, label: x.label };
    const value = { id: newId("tv"), label: clean };
    set(overlayAtom, (prev) =>
      update(prev, corpus, (o) => ({ ...o, values: { ...o.values, [thesaurusId]: [...t.values, value] } })),
    );
    return value;
  },
);

/** Create a thesaurus, and optionally link a template property to it. Takes
 *  plain `labels` (the form's one-per-line box) or ready-made `values` (the
 *  Settings editor, which builds groups). Returns its id. */
export const createThesaurusAtom = atom(
  null,
  (
    _get,
    set,
    {
      corpus,
      name,
      labels = [],
      values: given,
      bind,
    }: {
      corpus: Corpus;
      name: string;
      labels?: string[];
      values?: ThesaurusValue[];
      bind?: { typeId: string; propertyId: string };
    },
  ): string => {
    const id = newId("th");
    const values: ThesaurusValue[] = given ?? [];
    if (!given) {
      const seen = new Set<string>();
      for (const raw of labels) {
        const label = raw.trim();
        if (!label || seen.has(foldLabel(label))) continue;
        seen.add(foldLabel(label));
        values.push({ id: newId("tv"), label });
      }
    }
    const record: ThesaurusRecord = { id, name: name.trim() || "Untitled", itemCount: countValues(values), values };
    set(overlayAtom, (prev) =>
      update(prev, corpus, (o) => ({
        ...o,
        created: [...o.created, record],
        bindings: bind ? { ...o.bindings, [bindingKey(bind.typeId, bind.propertyId)]: id } : o.bindings,
      })),
    );
    return id;
  },
);

/** Settings' editor Save: the name and the whole value list. `id` null creates. */
export const saveThesaurusAtom = atom(
  null,
  (
    _get,
    set,
    { corpus, id, name, values }: { corpus: Corpus; id: string | null; name: string; values: ThesaurusValue[] },
  ): string => {
    if (!id) return set(createThesaurusAtom, { corpus, name, values });
    set(overlayAtom, (prev) =>
      update(prev, corpus, (o) => ({
        ...o,
        renamed: { ...o.renamed, [id]: name },
        values: { ...o.values, [id]: values },
      })),
    );
    return id;
  },
);

export const deleteThesaurusAtom = atom(null, (_get, set, { corpus, id }: { corpus: Corpus; id: string }) => {
  set(overlayAtom, (prev) => update(prev, corpus, (o) => ({ ...o, deleted: [...new Set([...o.deleted, id])] })));
});

/* ── Languages ────────────────────────────────────────────────────────────
   A record stores a chosen value's LABEL in its own language, and the
   thesaurus holds one label per value (the corpus's own language). So the
   form reads the list in the language it is writing, and a choice is written
   into every language's record by value id. Only CEJIL's records carry the
   ids and the translations; the Sample's labels are one language throughout. */

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

/** The thesaurus's values with labels in `lang`, where the corpus knows them.
 *  Cached per (list, language): every picker row and every entity a bulk
 *  plan reads asks, and the list only changes when the store does. */
const localizedCache = new WeakMap<ThesaurusValue[], Map<Language, ThesaurusValue[]>>();
export function localizeValues(values: ThesaurusValue[], corpus: Corpus, lang: Language): ThesaurusValue[] {
  if (corpus !== "cejil") return values;
  let byLang = localizedCache.get(values);
  const hit = byLang?.get(lang);
  if (hit) return hit;
  const map = cejilValueLabels(lang);
  if (!map.size) return values;
  const tr = (v: { id: string; label: string }) => map.get(v.id) ?? v.label;
  const out = values.map((v) =>
    v.values ? { ...v, label: tr(v), values: v.values.map((c) => ({ ...c, label: tr(c) })) } : { ...v, label: tr(v) },
  );
  if (!byLang) localizedCache.set(values, (byLang = new Map()));
  byLang.set(lang, out);
  return out;
}

/** id → label, for every selectable value in a list. */
function labelIndex(values: ThesaurusValue[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const v of values) {
    if (v.values) for (const c of v.values) m.set(c.id, c.label);
    else m.set(v.id, v.label);
  }
  return m;
}

/* ── Keys ─────────────────────────────────────────────────────────────────
   A chosen value is addressed by its thesaurus VALUE ID, never by its label:
   two values can share a label ("Otros" under two groups), and a label is
   one language's. A label the thesaurus doesn't hold (free text from before
   a thesaurus was bound, a value of a deleted thesaurus) gets a pseudo-key,
   "label:<text>", and is written back as it is. */
export const pseudoKey = (label: string) => `label:${label}`;
export const isPseudoKey = (key: string) => key.startsWith("label:");

/** The keys of the values a select / multiselect field holds, in `lang`. Ids
 *  the record stores win; a label without one is placed by the FIRST value
 *  carrying it in that language (the Sample stores labels only). */
export function fieldKeys(
  f: { type: string; value: string; values?: string[]; valueIds?: string[] },
  thesaurus: ThesaurusValue[] | null,
  corpus: Corpus,
  lang: Language,
): string[] {
  const labels = f.values ?? (f.value ? [f.value] : []);
  const first = new Map<string, string>();
  if (thesaurus)
    for (const [id, label] of labelIndex(localizeValues(thesaurus, corpus, lang)))
      if (!first.has(label)) first.set(label, id);
  return labels.map((l, i) => f.valueIds?.[i] || first.get(l) || pseudoKey(l));
}

/** A key's label in `lang`. */
export function labelForKey(key: string, thesaurus: ThesaurusValue[] | null, corpus: Corpus, lang: Language): string {
  if (isPseudoKey(key)) return key.slice(6);
  const local = thesaurus ? labelIndex(localizeValues(thesaurus, corpus, lang)).get(key) : undefined;
  return local ?? (corpus === "cejil" ? cejilValueLabels(lang).get(key) : undefined) ?? key;
}

/** Keys as labels in every language, and the ids to store beside them. */
export function labelsForKeys(
  keys: string[],
  thesaurus: ThesaurusValue[] | null,
  corpus: Corpus,
): { byLang: Record<Language, string[]>; ids: (string | null)[] } {
  const byLang = Object.fromEntries(
    LANGS.map((l) => [l, keys.map((k) => labelForKey(k, thesaurus, corpus, l))]),
  ) as Record<Language, string[]>;
  return { byLang, ids: keys.map((k) => (isPseudoKey(k) ? null : k)) };
}
