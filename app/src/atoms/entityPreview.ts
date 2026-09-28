import { atom } from "jotai";
import { filtersDrawerBase, overlayEntityBase, overlayStackBase } from "./rightPane";
import { breakpointAtom } from "./viewport";
import { scopedFiltersOpenAtom, scopedRelStateAtom } from "./filters";

/** The entity shown in the preview slide-over (null = closed). On a phone the
 *  previews stack as sheets. */
export const previewEntityIdAtom = atom(
  (get) => get(overlayEntityBase),
  (get, set, id: string | null) => {
    // A phone stacks: an entity opened while a preview is open is a new sheet
    // on top, and closing pops one. Elsewhere the one overlay is replaced.
    const stack = get(overlayStackBase);
    const top = stack[stack.length - 1] ?? null;
    const stacks = get(breakpointAtom) === "mobile" && stack.length > 0;
    let next: string[];
    let removed: string | null = null;
    if (id === null) {
      removed = top;
      next = stacks ? stack.slice(0, -1) : [];
    } else if (stacks) {
      next = top === id ? stack : [...stack.filter((x) => x !== id), id];
    } else {
      removed = top;
      next = [id];
    }
    set(overlayStackBase, next);
    set(overlayEntityBase, next[next.length - 1] ?? null);
    // Opening the overlay closes the HOST's Filters: they dock into the same
    // region, and side by side neither one is usable. Closing it (id === null)
    // leaves Filters alone — a reader who dismisses a preview has not asked for
    // a filter panel. See atoms/rightPane.
    if (id !== null) set(filtersDrawerBase, false);
    // The overlay's OWN filters state goes with the overlay, always: a drawer
    // left open on the last previewed entity must not be waiting inside the
    // next one.
    set(scopedFiltersOpenAtom, {});
    // Same for its facets, search and view: the overlay opens on the defaults
    // every time, not on what the reader left in the last preview of it.
    // A layer popped back to keeps what its reader left in it.
    set(scopedRelStateAtom, (state) => {
      const kept = { ...state };
      if (removed) delete kept[removed];
      if (id) delete kept[id];
      return kept;
    });
  },
);

/** Close every connection overlay at once ("Open entity" leaves them all). */
export const closeAllOverlaysAtom = atom(null, (_get, set) => {
  set(overlayStackBase, []);
  set(overlayEntityBase, null);
  set(scopedFiltersOpenAtom, {});
});
