/* Split's two panes run the same full-corpus passes whenever their filters
   are equal (Sync filters on, or both panes left as they opened). The second
   pane reads the first one's result instead of passing over the corpus again.
   Keyed by the corpus array, which both panes share (`libraryEntitiesAtom` is
   cached by input), and by a string of everything the pass reads. A few
   entries per corpus: two panes, a handful of passes each. */
const cache = new WeakMap<object, Map<string, unknown>>();
const MAX_ENTRIES = 16;

export function sharedPass<T>(corpus: object, key: string, run: () => T): T {
  let entries = cache.get(corpus);
  if (!entries) cache.set(corpus, (entries = new Map()));
  if (entries.has(key)) {
    const hit = entries.get(key) as T;
    // Most recent last, so the oldest is the one dropped.
    entries.delete(key);
    entries.set(key, hit);
    return hit;
  }
  const value = run();
  entries.set(key, value);
  if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  return value;
}

/** A stable number per object, for keys that must tell two versions of a
 *  store's value apart (a template edit rebuilds the chain facets). */
const ids = new WeakMap<object, number>();
let nextId = 0;
export function identityOf(o: object): number {
  let id = ids.get(o);
  if (id === undefined) ids.set(o, (id = ++nextId));
  return id;
}
