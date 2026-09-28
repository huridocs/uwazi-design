import { atom } from "jotai";

/** The entity drawer's open tab. Shared so a highlight, minimap or evidence
 *  click can switch the drawer to "relationships". */
export const activeDrawerTabAtom = atom("metadata");
