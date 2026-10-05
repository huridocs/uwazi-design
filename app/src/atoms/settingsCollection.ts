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

/** Storage keys carry a version. A change to a record's shape bumps it, so
 *  an older session's data is never read as the new shape. */
export const SETTINGS_STORAGE_VERSION = 2;
const storageKey = (name: string, scope: string) => `uwazi:settings:v${SETTINGS_STORAGE_VERSION}:${name}:${scope}`;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** A record any store accepts: an object with a string id. */
export const hasId = (r: unknown): r is { id: string } => isPlainObject(r) && typeof r.id === "string";

/** What storage hands back is outside the app's control. Each entry is
 *  checked on its own and a bad one is dropped, never the whole overlay and
 *  never a throw: a created record that fails `isRecord`, a patch that is not
 *  an object, a deleted id that is not a string. */
function cleanOverlay<T>(v: unknown, isRecord: (r: unknown) => boolean): Overlay<T> {
  if (!isPlainObject(v)) return emptyOverlay<T>();
  const created = Array.isArray(v.created) ? (v.created.filter(isRecord) as T[]) : [];
  const patched = isPlainObject(v.patched)
    ? (Object.fromEntries(Object.entries(v.patched).filter(([, p]) => isPlainObject(p))) as Record<string, Partial<T>>)
    : {};
  const deleted = Array.isArray(v.deleted) ? v.deleted.filter((x): x is string => typeof x === "string") : [];
  return { created, patched, deleted };
}

function sessionStore() {
  // Accessing `sessionStorage` itself throws where site data is blocked.
  try {
    return sessionStorage;
  } catch {
    return undefined as unknown as Storage;
  }
}

function sessionOverlay<T>(key: string, isRecord: (r: unknown) => boolean) {
  const json = createJSONStorage<Overlay<T>>(sessionStore);
  return atomWithStorage<Overlay<T>>(
    key,
    emptyOverlay<T>(),
    { ...json, getItem: (k, init) => cleanOverlay<T>(json.getItem(k, init), isRecord) },
    { getOnInit: true },
  );
}

/** How each settings store clears its changes, for "Reset demo data". Stores
 *  not built on this helper (`atoms/thesauri.ts`) register theirs too. */
const resetters: ((set: Setter, get: Getter) => void)[] = [];
/** Resetters run in registration order, so one registered after a store
 *  sees that store already reset. */
export function registerSettingsReset(reset: (set: Setter, get: Getter) => void) {
  resetters.push(reset);
}

/** Clear every settings overlay: each store reads its seed again. */
export const resetSettingsDataAtom = atom(null, (get, set) => {
  for (const reset of resetters) reset(set, get);
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
  /** Whether a record from storage, or a record with its patch applied, has
   *  the domain's shape. A created record that fails is dropped; a patched
   *  seed record that fails reads as its seed. Defaults to `hasId`. */
  isRecord?: (r: unknown) => boolean;
}

export function createSettingsCollection<T extends { id: string }>({
  name,
  idPrefix,
  seedOf,
  corpusScoped,
  isRecord = hasId,
}: SettingsCollectionOptions<T>) {
  const overlayAtom = atomFamily((scope: Scope) => sessionOverlay<T>(storageKey(name, scope), isRecord));
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
      // A patch that would break the record's shape is ignored.
      const apply = (r: T): T => {
        if (!o.patched[r.id]) return r;
        const next = { ...r, ...o.patched[r.id] };
        return isRecord(next) ? next : r;
      };
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

  /** A created record is simply dropped; only a seed record needs its id in
   *  `deleted`, so the list stays as long as the seed deletions. */
  const deleteAtom = atom(null, (get, set, { id, corpus }: { id: string; corpus?: Corpus }) => {
    set(overlayAtom(scopeOf(get, corpus)), (o) => {
      const wasCreated = o.created.some((r) => r.id === id);
      return {
        created: o.created.filter((r) => r.id !== id),
        patched: Object.fromEntries(Object.entries(o.patched).filter(([k]) => k !== id)),
        deleted: wasCreated ? o.deleted : [...new Set([...o.deleted, id])],
      };
    });
  });

  return { listAtom, listOfAtom, createAtom, patchAtom, deleteAtom };
}

/* ── Singletons ─────────────────────────────────────────────────────────
   A settings domain that is one value per corpus rather than a list
   (Collection, Global CSS & JS, Filters). The seed is the corpus's own; the
   session keeps the last saved value, field by field, in sessionStorage. */

export interface SettingsSingletonOptions<T extends Record<string, unknown>> {
  name: string;
  seedOf: (corpus: Corpus, get: Getter) => T;
  /** Per-field checks for what storage hands back. A field without one must
   *  match the seed's kind (same `typeof`, both arrays or neither). A field
   *  that fails reads as the seed's. */
  isField?: { [K in keyof T]?: (v: unknown) => boolean };
}

const sameKind = (a: unknown, b: unknown) => typeof a === typeof b && Array.isArray(a) === Array.isArray(b);

export function createSettingsSingleton<T extends Record<string, unknown>>({
  name,
  seedOf,
  isField = {},
}: SettingsSingletonOptions<T>) {
  const json = createJSONStorage<Partial<T>>(sessionStore);
  const savedAtom = atomFamily((corpus: Corpus) =>
    atomWithStorage<Partial<T>>(
      storageKey(name, corpus),
      {},
      { ...json, getItem: (k, init) => { const v = json.getItem(k, init); return isPlainObject(v) ? (v as Partial<T>) : init; } },
      { getOnInit: true },
    ),
  );
  registerSettingsReset((set) => {
    for (const s of SCOPES) if (s !== "global") set(savedAtom(s), RESET);
  });

  /** One corpus's value: the seed, with each saved field that passes. */
  const valueOfAtom = atomFamily((corpus: Corpus) =>
    atom<T>((get) => {
      const seed = seedOf(corpus, get);
      const saved = get(savedAtom(corpus)) as Record<string, unknown>;
      const out: Record<string, unknown> = { ...seed };
      for (const k of Object.keys(seed)) {
        if (!(k in saved)) continue;
        const check = isField[k as keyof T];
        if (check ? check(saved[k]) : sameKind(saved[k], seed[k])) out[k] = saved[k];
      }
      return out as T;
    }),
  );

  /** The value of the corpus the app is showing. */
  const valueAtom = atom((get) => get(valueOfAtom(get(dataSourceAtom))));

  /** Store a whole value for a corpus (the active one by default). */
  const saveAtom = atom(null, (get, set, { value, corpus }: { value: T; corpus?: Corpus }) => {
    set(savedAtom(corpus ?? get(dataSourceAtom)), value as Partial<T>);
  });

  return { valueAtom, valueOfAtom, saveAtom };
}
