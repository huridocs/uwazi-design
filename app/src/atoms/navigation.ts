import { atomWithStorage, createJSONStorage } from "jotai/utils";

export type AppView = "entity" | "library" | "catalog" | "import-csv" | "settings";

/** Which top-level surface is showing.
 *
 *  Kept in SESSION storage, not local. The point of persisting it was that a
 *  reload shouldn't bounce you back to the Library — and sessionStorage does
 *  exactly that. localStorage went further than asked: it made the last page you
 *  happened to be on your permanent front door, so the deployed prototype opened
 *  on whatever entity someone had left behind days earlier instead of the Library.
 *  A visit starts at the Library; a reload keeps your place. */
const sessionJSON = createJSONStorage<AppView>(() => sessionStorage);

export const appViewAtom = atomWithStorage<AppView>("uwazi:appView", "library", sessionJSON, {
  getOnInit: true,
});
