import { atomWithStorage } from "jotai/utils";

export type AppView = "entity" | "library" | "catalog" | "import-csv" | "settings";

/** Which top-level surface is showing. Persisted so a browser reload keeps you
 *  on the same page instead of bouncing back to the Library home. Default
 *  (first visit) lands on the Library index. */
export const appViewAtom = atomWithStorage<AppView>("uwazi:appView", "library");
