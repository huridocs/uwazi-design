import { atom } from "jotai";
import { atomFamily, atomWithStorage, createJSONStorage } from "jotai/utils";
import { dataSourceAtom, type DataSource } from "./dataSource";
import { registerSettingsReset } from "./settingsReset";
import { entityCorpusOf } from "../data/entities";

/* ── The notebook ──────────────────────────────────────────────────────────
   A named set of pinned records and free notes, one per collection, kept in
   this browser (localStorage). No accounts: a notebook is a researcher's working
   file, exported as CSV or as a citation list when it leaves the browser. */

export interface NotebookPin {
  id: string;
  /** When it was pinned (ms); the list keeps pin order. */
  at: number;
}

/** A pinned passage: the words a search result showed, on the record they
 *  were found on, with where they are (a page, or the reference a quote or
 *  annotation belongs to). Cited on its own; the record is not pinned. */
export interface PassagePin {
  entityId: string;
  text: string;
  page?: number;
  /** The reference behind a quote or annotation (`MetadataSnippet.refId`). */
  refId?: string;
  at: number;
}

/** One passage's identity: the same words in the same place pin once. */
export const passagePinKey = (p: Omit<PassagePin, "at">) =>
  `${p.entityId}\u0000${p.refId ?? ""}\u0000${p.page ?? ""}\u0000${p.text}`;

export interface Notebook {
  name: string;
  pins: NotebookPin[];
  /** Absent in notebooks saved before passages could be pinned. */
  passages?: PassagePin[];
  /** Markdown. */
  notes: string;
  updatedAt: number;
}

const EMPTY_NOTEBOOK: Notebook = { name: "", pins: [], notes: "", updatedAt: 0 };

const STORAGE_KEY = "uwazi:notebooks";
/** Where the notebooks were kept when the feature was called "Case". */
const LEGACY_STORAGE_KEY = "uwazi:cases";

/** Move a store saved under the old key to the new one, once, so pins and
 *  notes made before the rename survive it. Runs before the atom first reads
 *  storage. A store already under the new key wins; the old key goes either
 *  way. */
function migrateLegacyStore() {
  try {
    const old = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (old === null) return;
    if (localStorage.getItem(STORAGE_KEY) === null) localStorage.setItem(STORAGE_KEY, old);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* storage blocked */
  }
}
migrateLegacyStore();

const notebooksStoreAtom = atomWithStorage<Partial<Record<DataSource, Notebook>>>(
  STORAGE_KEY,
  {},
  createJSONStorage(() => localStorage),
  { getOnInit: true },
);

/** The notebook of the collection shown. */
export const notebookAtom = atom((get) => get(notebooksStoreAtom)[get(dataSourceAtom)] ?? EMPTY_NOTEBOOK);

/** The default name, for a notebook the reader has not named. */
export const UNNAMED_NOTEBOOK = "Untitled notebook";

/** Pinned ids of every collection's notebook, for `entityPinnedAtom`. An entity id
 *  belongs to one collection, so one set answers for all of them. */
const pinnedIdsAtom = atom((get) => {
  const out = new Set<string>();
  for (const c of Object.values(get(notebooksStoreAtom))) for (const p of c?.pins ?? []) out.add(p.id);
  return out;
});

/** Is this entity pinned? Read per card, never the set, so a pin re-renders
 *  only the card it changes. */
export const entityPinnedAtom = atomFamily((id: string) => atom((get) => get(pinnedIdsAtom).has(id)));

export const notebookPinCountAtom = atom((get) => get(notebookAtom).pins.length + (get(notebookAtom).passages?.length ?? 0));

const pinnedPassagesAtom = atom((get) => {
  const out = new Set<string>();
  for (const c of Object.values(get(notebooksStoreAtom))) for (const p of c?.passages ?? []) out.add(passagePinKey(p));
  return out;
});

/** Is this passage pinned? Read per line, as `entityPinnedAtom` is per card. */
export const passagePinnedAtom = atomFamily((key: string) => atom((get) => get(pinnedPassagesAtom).has(key)));

/** Change one collection's notebook. */
const updateNotebook = atom(null, (get, set, { corpus, fn }: { corpus: DataSource; fn: (c: Notebook) => Notebook }) => {
  const all = get(notebooksStoreAtom);
  set(notebooksStoreAtom, { ...all, [corpus]: { ...fn(all[corpus] ?? EMPTY_NOTEBOOK), updatedAt: Date.now() } });
});

/** Pin or unpin an entity in its own collection's notebook (the entity view and
 *  a relationship pill can show a record of the collection shown only, but
 *  the corpus is read from the id so a pin never lands in the wrong notebook). */
export const togglePinAtom = atom(null, (get, set, id: string) => {
  const corpus = (entityCorpusOf(id) as DataSource | undefined) ?? get(dataSourceAtom);
  set(updateNotebook, {
    corpus,
    fn: (c) =>
      c.pins.some((p) => p.id === id)
        ? { ...c, pins: c.pins.filter((p) => p.id !== id) }
        : { ...c, pins: [...c.pins, { id, at: Date.now() }] },
  });
});

/** Pin or unpin a passage in its record's collection's notebook. */
export const togglePassagePinAtom = atom(null, (get, set, passage: Omit<PassagePin, "at">) => {
  const corpus = (entityCorpusOf(passage.entityId) as DataSource | undefined) ?? get(dataSourceAtom);
  const key = passagePinKey(passage);
  set(updateNotebook, {
    corpus,
    fn: (c) => {
      const list = c.passages ?? [];
      return list.some((p) => passagePinKey(p) === key)
        ? { ...c, passages: list.filter((p) => passagePinKey(p) !== key) }
        : { ...c, passages: [...list, { ...passage, at: Date.now() }] };
    },
  });
});

/** Take a record out of the notebook: its pin and any passage pinned from it. */
export const unpinAtom = atom(null, (get, set, id: string) => {
  set(updateNotebook, {
    corpus: get(dataSourceAtom),
    fn: (c) => ({ ...c, pins: c.pins.filter((p) => p.id !== id), passages: (c.passages ?? []).filter((p) => p.entityId !== id) }),
  });
});

export const renameNotebookAtom = atom(null, (get, set, name: string) => {
  set(updateNotebook, { corpus: get(dataSourceAtom), fn: (c) => ({ ...c, name }) });
});

export const setNotebookNotesAtom = atom(null, (get, set, notes: string) => {
  set(updateNotebook, { corpus: get(dataSourceAtom), fn: (c) => ({ ...c, notes }) });
});

/** Empty the collection shown's notebook: pins, notes and name. */
export const clearNotebookAtom = atom(null, (get, set) => {
  const all = { ...get(notebooksStoreAtom) };
  delete all[get(dataSourceAtom)];
  set(notebooksStoreAtom, all);
});

/** The Notebook slide-over. */
export const notebookOpenAtom = atom(false);

/** Every collection's notebook, for the Dev panel's switch and Reset demo data. */
export const clearAllNotebooksAtom = atom(null, (_get, set) => {
  set(notebooksStoreAtom, {});
  set(notebookOpenAtom, false);
});
registerSettingsReset((set) => set(clearAllNotebooksAtom));
