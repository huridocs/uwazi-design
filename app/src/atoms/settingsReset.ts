import { atom, type Getter, type Setter } from "jotai";

/** How each settings store clears its changes, for "Reset demo data". Kept
 *  in a module with no app imports: stores register while the module graph
 *  is still loading (a cycle through `dataSource` reaches a store before
 *  `settingsCollection` has run), and this list must exist by then.
 *
 *  Resetters run in registration order, so one registered after a store sees
 *  that store already reset. */
const resetters: ((set: Setter, get: Getter) => void)[] = [];
export function registerSettingsReset(reset: (set: Setter, get: Getter) => void) {
  resetters.push(reset);
}

/** Clear every settings overlay: each store reads its seed again. */
export const resetSettingsDataAtom = atom(null, (get, set) => {
  for (const reset of resetters) reset(set, get);
});
