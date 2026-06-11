import { atom } from "jotai";

export type AppView = "entity" | "library" | "catalog" | "import-csv";

/** Land on the Library index — it's the home surface now that entities are
 *  browsable as standalone records. */
export const appViewAtom = atom<AppView>("library");
