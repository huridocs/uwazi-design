import { atom } from "jotai";

/** Which Split pane a store is: "left" in the root store, "right" in the right
 *  pane's scope (`atoms/librarySplit.ts` sets it). Outside Split, "left". Its
 *  own module so the dirty guard can read it without importing the Library. */
export const libraryPaneSideAtom = atom<"left" | "right">("left");
