import { atom } from "jotai";

export type AppView = "entity" | "library" | "catalog" | "import-csv" | "settings" | "login";

/** Which top-level surface is showing. Every load (fresh tab, reload, deploy
 *  URL) opens on the Library; a switch lasts until the next load and is not
 *  stored. */
export const appViewAtom = atom<AppView>("library");

// The view used to be kept in sessionStorage under this key; drop it so an
// old value has no effect.
try {
  sessionStorage.removeItem("uwazi:appView");
} catch {
  /* storage blocked */
}

/** One-shot: the Import CSV view opens its New Import dialog on arrival. Set by
 *  the Library's "Import CSV" action, consumed (and cleared) by the view. */
export const openNewImportOnArrivalAtom = atom(false);
