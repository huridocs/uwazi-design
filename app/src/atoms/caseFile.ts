import { atom } from "jotai";
import { atomFamily, atomWithStorage, createJSONStorage } from "jotai/utils";
import { dataSourceAtom, type DataSource } from "./dataSource";
import { registerSettingsReset } from "./settingsReset";
import { entityCorpusOf } from "../data/entities";

/* ── The case ──────────────────────────────────────────────────────────────
   A named set of pinned records and free notes, one per collection, kept in
   this browser (localStorage). No accounts: a case is a researcher's working
   file, exported as CSV or as a citation list when it leaves the browser. */

export interface CasePin {
  id: string;
  /** When it was pinned (ms); the list keeps pin order. */
  at: number;
}

export interface CaseFile {
  name: string;
  pins: CasePin[];
  /** Markdown. */
  notes: string;
  updatedAt: number;
}

const EMPTY_CASE: CaseFile = { name: "", pins: [], notes: "", updatedAt: 0 };

const casesStoreAtom = atomWithStorage<Partial<Record<DataSource, CaseFile>>>(
  "uwazi:cases",
  {},
  createJSONStorage(() => localStorage),
  { getOnInit: true },
);

/** The case of the collection shown. */
export const caseAtom = atom((get) => get(casesStoreAtom)[get(dataSourceAtom)] ?? EMPTY_CASE);

/** The default name, for a case the reader has not named. */
export const UNNAMED_CASE = "Untitled case";

/** Pinned ids of every collection's case, for `entityPinnedAtom`. An entity id
 *  belongs to one collection, so one set answers for all of them. */
const pinnedIdsAtom = atom((get) => {
  const out = new Set<string>();
  for (const c of Object.values(get(casesStoreAtom))) for (const p of c?.pins ?? []) out.add(p.id);
  return out;
});

/** Is this entity pinned? Read per card, never the set, so a pin re-renders
 *  only the card it changes. */
export const entityPinnedAtom = atomFamily((id: string) => atom((get) => get(pinnedIdsAtom).has(id)));

export const casePinCountAtom = atom((get) => get(caseAtom).pins.length);

/** Change one collection's case. */
const updateCase = atom(null, (get, set, { corpus, fn }: { corpus: DataSource; fn: (c: CaseFile) => CaseFile }) => {
  const all = get(casesStoreAtom);
  set(casesStoreAtom, { ...all, [corpus]: { ...fn(all[corpus] ?? EMPTY_CASE), updatedAt: Date.now() } });
});

/** Pin or unpin an entity in its own collection's case (the entity view and
 *  a relationship pill can show a record of the collection shown only, but
 *  the corpus is read from the id so a pin never lands in the wrong case). */
export const togglePinAtom = atom(null, (get, set, id: string) => {
  const corpus = (entityCorpusOf(id) as DataSource | undefined) ?? get(dataSourceAtom);
  set(updateCase, {
    corpus,
    fn: (c) =>
      c.pins.some((p) => p.id === id)
        ? { ...c, pins: c.pins.filter((p) => p.id !== id) }
        : { ...c, pins: [...c.pins, { id, at: Date.now() }] },
  });
});

export const unpinAtom = atom(null, (get, set, id: string) => {
  set(updateCase, { corpus: get(dataSourceAtom), fn: (c) => ({ ...c, pins: c.pins.filter((p) => p.id !== id) }) });
});

export const renameCaseAtom = atom(null, (get, set, name: string) => {
  set(updateCase, { corpus: get(dataSourceAtom), fn: (c) => ({ ...c, name }) });
});

export const setCaseNotesAtom = atom(null, (get, set, notes: string) => {
  set(updateCase, { corpus: get(dataSourceAtom), fn: (c) => ({ ...c, notes }) });
});

/** Empty the collection shown's case: pins, notes and name. */
export const clearCaseAtom = atom(null, (get, set) => {
  const all = { ...get(casesStoreAtom) };
  delete all[get(dataSourceAtom)];
  set(casesStoreAtom, all);
});

/** The Case slide-over. */
export const caseOpenAtom = atom(false);

/** Every collection's case, for the Dev panel's switch and Reset demo data. */
export const clearAllCasesAtom = atom(null, (_get, set) => {
  set(casesStoreAtom, {});
  set(caseOpenAtom, false);
});
registerSettingsReset((set) => set(clearAllCasesAtom));
