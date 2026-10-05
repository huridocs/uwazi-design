import { atom, type Getter, type Setter } from "jotai";
import { atomFamily, atomWithStorage, createJSONStorage, RESET } from "jotai/utils";
import type { Corpus } from "../data/entityChanges";
import { dataSourceAtom } from "./dataSource";

/** One settings domain's records (users, groups, …) — the store Settings and
 *  every other reader of that domain share. Generalises `atoms/thesauri.ts`:
 *  the seed is a static import, so the session's CHANGES are what is kept, and
 *  the list every reader sees is the seed with them applied.
 *   - `created` — records that did not exist, in creation order;
 *   - `patched` — fields changed on a record, merged over the seed's;
 *   - `deleted` — ids removed, seed or created.
 *
 *  `corpusScoped` decides where the changes live: one overlay per corpus (the
 *  collection's content model — templates, thesauri, relation types), or one
 *  for the whole prototype (the people who sign in — users, groups). See
 *  CLAUDE.md › Data model › Settings stores.
 *
 *  Each overlay is kept in sessionStorage, like the other session settings
 *  (`atoms/session.ts`): a reload keeps the demo's edits, a new visit starts
 *  from the seed. "Reset demo data" clears them all (`resetSettingsDataAtom`). */
export interface Overlay<T> {
  created: T[];
  patched: Record<string, Partial<T>>;
  deleted: string[];
}

/** Where an overlay lives: a corpus, or `global`. */
type Scope = Corpus | "global";
const SCOPES: Scope[] = ["mock", "cejil", "artworks", "travesia", "global"];

const emptyOverlay = <T>(): Overlay<T> => ({ created: [], patched: {}, deleted: [] });

const isOverlay = (v: unknown): v is Overlay<unknown> =>
  !!v &&
  typeof v === "object" &&
  Array.isArray((v as Overlay<unknown>).created) &&
  Array.isArray((v as Overlay<unknown>).deleted) &&
  typeof (v as Overlay<unknown>).patched === "object" &&
  (v as Overlay<unknown>).patched !== null;

function sessionOverlay<T>(key: string) {
  const json = createJSONStorage<Overlay<T>>(() => {
    // Accessing `sessionStorage` itself throws where site data is blocked.
    try {
      return sessionStorage;
    } catch {
      return undefined as unknown as Storage;
    }
  });
  // What storage hands back is outside the app's control: anything that is not
  // an overlay reads as an empty one.
  return atomWithStorage<Overlay<T>>(
    key,
    emptyOverlay<T>(),
    { ...json, getItem: (k, init) => { const v = json.getItem(k, init); return isOverlay(v) ? (v as Overlay<T>) : init; } },
    { getOnInit: true },
  );
}

/** How each settings store clears its changes, for "Reset demo data". Stores
 *  not built on this helper (`atoms/thesauri.ts`) register theirs too. */
const resetters: ((set: Setter) => void)[] = [];
export function registerSettingsReset(reset: (set: Setter) => void) {
  resetters.push(reset);
}

/** Clear every settings overlay: each store reads its seed again. */
export const resetSettingsDataAtom = atom(null, (_get, set) => {
  for (const reset of resetters) reset(set);
});

let seq = 0;
/** A fresh id: time plus a sequence, so two records made in the same
 *  millisecond, or one made after a delete, never share one (the old
 *  `tpl-${length}-…` ids did). */
export const newSettingsId = (prefix: string) => {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
};

export interface SettingsCollectionOptions<T> {
  /** Storage name, also the id prefix's fallback ("users"). */
  name: string;
  /** Prefix of created ids ("u", "g"). */
  idPrefix: string;
  /** The seed for a scope. `get` lets a lazily loaded corpus recompute when its
   *  data arrives. Global stores are called with `"global"`. */
  seedOf: (scope: Scope, get: Getter) => T[];
  corpusScoped: boolean;
}

export function createSettingsCollection<T extends { id: string }>({
  name,
  idPrefix,
  seedOf,
  corpusScoped,
}: SettingsCollectionOptions<T>) {
  const overlayAtom = atomFamily((scope: Scope) => sessionOverlay<T>(`uwazi:settings:${name}:${scope}`));
  registerSettingsReset((set) => {
    for (const s of SCOPES) set(overlayAtom(s), RESET);
  });

  const scopeOf = (get: Getter, corpus?: Corpus): Scope =>
    corpusScoped ? (corpus ?? get(dataSourceAtom)) : "global";

  /** One scope's records, seed plus changes. */
  const listOfAtom = atomFamily((scope: Scope) =>
    atom<T[]>((get) => {
      const o = get(overlayAtom(scope));
      const deleted = new Set(o.deleted);
      const apply = (r: T): T => (o.patched[r.id] ? { ...r, ...o.patched[r.id] } : r);
      return [...seedOf(scope, get), ...o.created].filter((r) => !deleted.has(r.id)).map(apply);
    }),
  );

  /** The records of the corpus the app is showing (or the global list). */
  const listAtom = atom((get) => get(listOfAtom(scopeOf(get))));

  /** Add a record; returns its id. */
  const createAtom = atom(null, (get, set, { value, corpus }: { value: Omit<T, "id">; corpus?: Corpus }): string => {
    const id = newSettingsId(idPrefix);
    set(overlayAtom(scopeOf(get, corpus)), (o) => ({ ...o, created: [...o.created, { ...value, id } as T] }));
    return id;
  });

  /** Merge fields into a record. */
  const patchAtom = atom(
    null,
    (get, set, { id, patch, corpus }: { id: string; patch: Partial<Omit<T, "id">>; corpus?: Corpus }) => {
      set(overlayAtom(scopeOf(get, corpus)), (o) => ({
        ...o,
        patched: { ...o.patched, [id]: { ...o.patched[id], ...patch } as Partial<T> },
      }));
    },
  );

  const deleteAtom = atom(null, (get, set, { id, corpus }: { id: string; corpus?: Corpus }) => {
    set(overlayAtom(scopeOf(get, corpus)), (o) => ({
      created: o.created.filter((r) => r.id !== id),
      patched: Object.fromEntries(Object.entries(o.patched).filter(([k]) => k !== id)),
      deleted: [...new Set([...o.deleted, id])],
    }));
  });

  return { listAtom, listOfAtom, createAtom, patchAtom, deleteAtom };
}
