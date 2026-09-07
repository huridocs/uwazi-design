import { atom } from "jotai";

/** The two things that dock into the entity view's right-hand region, and the
 *  only reason they live in one file.
 *
 *  The connection overlay and the Relationships Filters drawer both take that
 *  region, and they were independent flags: opening the overlay from a row's eye
 *  icon while Filters was open left BOTH mounted, Filters at its full docked
 *  width and the overlay squeezed into what was left (measured x:604–1151 beside
 *  Filters at x:1151–1710).
 *
 *  The exclusion belongs in the atom layer, not in the triggers. There are eight
 *  places that open the overlay — a reference row, an aggregate row, a tree
 *  node, a graph node, an inherited value chip, a connection pill, an editor's
 *  Source button, a card stack — and the ninth is the one someone adds next
 *  week. So these are the private bases, and `overlayEntityIdAtom`
 *  (atoms/references) and `filtersDrawerOpenAtom` (atoms/filters) are writable
 *  derived atoms over them that each close the other. Every existing call site
 *  keeps its import, its name and its signature, and gets the behaviour.
 *
 *  They are HERE rather than in either of those files because the coupling is
 *  mutual and the modules are not: `references` already reaches `filters`
 *  through `focusedEntity`, so a direct edge back the other way would close a
 *  cycle. A base module both sides import has no direction to be wrong about. */

/** The entity whose connection overlay is open, or null. */
export const overlayEntityBase = atom<string | null>(null);

/** Whether the Relationships filters slide-over is open. */
export const filtersDrawerBase = atom(false);
