import { createContext, useContext, useEffect, useLayoutEffect, type KeyboardEvent, type MouseEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  libraryDrawnIdsAtom,
  entitySelectedAtom,
  librarySelectionActiveAtom,
  rangeSelectionAtom,
  toggleSelectionAtom,
} from "../../atoms/library";

/* ── The order a Shift range runs over ────────────────────────────────────
   "From the anchor to here" means in the order the reader SEES: the grid's
   loaded page, the timeline's dates, the Results ranking. Each view
   registers its drawn order when it commits (`useSelectionOrder`); a list
   drawn somewhere else at the same time (the selection or cluster drawer)
   scopes its own rows with `SelectionOrderScope`. Read at click time, so no
   card re-renders when the order changes. */
let viewOrder: readonly string[] = [];

/** Register the order the visible view draws its entities in, or `null` for
 *  a host that is not drawing the view right now. A layout effect, so only a
 *  committed render counts — a render React throws away (a deferred value's
 *  interrupted pass) no longer leaves its order behind — and it is in place
 *  before the browser paints anything to click. Only ONE mounted caller may
 *  pass ids at a time: a parent's layout effect runs after its child's. */
export function useSelectionOrder(ids: readonly string[] | null): void {
  useLayoutEffect(() => {
    if (ids) viewOrder = ids;
  }, [ids]);
}

/** Publish the ids the visible view draws, for "select all loaded" (see
 *  `libraryDrawnIdsAtom`). An effect, so only a committed render counts. */
export function useDrawnIds(ids: readonly string[]): void {
  const set = useSetAtom(libraryDrawnIdsAtom);
  useEffect(() => {
    set(ids);
  }, [ids, set]);
}

/** The current view's order, for a click handled outside a checkbox. */
export const currentSelectionOrder = (): readonly string[] => viewOrder;

const OrderScope = createContext<readonly string[] | null>(null);
export const SelectionOrderScope = OrderScope.Provider;

/** Pick up a click's intent: Cmd/Ctrl toggles, Shift ranges, anything else is
 *  the caller's own (a preview). Returns whether the click was a selection. */
export function selectionIntent(e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) {
  if (e.shiftKey) return "range" as const;
  if (e.metaKey || e.ctrlKey) return "toggle" as const;
  return null;
}

/** A row's mousedown: with Shift held, keep the browser from extending the
 *  page's text selection to the click — a Shift+click on a row is a range of
 *  ENTITIES, and without this it also highlighted every line between the
 *  anchor and the row. The click itself still fires. */
export function holdTextSelection(e: MouseEvent) {
  if (e.shiftKey) e.preventDefault();
}

/** One entity's checkbox — the same control in a card, a table row, a
 *  timeline line, a Results card and a drawer row.
 *
 *  A real `<input type="checkbox">`, named "Select <title>", a tab stop after
 *  the row's primary action. Hidden at rest and shown on hover, on focus
 *  within the row, when checked, and on EVERY row while anything is selected;
 *  its slot is reserved either way, so showing it moves nothing.
 *
 *  Keys: Space toggles (native); Shift+Space and Shift+Arrow extend the range
 *  from the anchor, the arrow moving focus to the next box in the view's
 *  order. Clicks stop here — the row's own click is the preview. */
export function EntitySelectBox({ id, title, className = "" }: { id: string; title: string; className?: string }) {
  const checked = useAtomValue(entitySelectedAtom(id));
  const active = useAtomValue(librarySelectionActiveAtom);
  const toggle = useSetAtom(toggleSelectionAtom);
  const range = useSetAtom(rangeSelectionAtom);
  const scoped = useContext(OrderScope);
  const order = () => scoped ?? viewOrder;

  const onClick = (e: MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
    // The input is controlled: the atoms decide, and React restores `checked`
    // from them — so a Shift+click range is not also a native toggle.
    if (e.shiftKey) range({ order: order(), id });
    else toggle(id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!e.shiftKey || (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowRight" && e.key !== "ArrowLeft"))
      return;
    const list = order();
    const i = list.indexOf(id);
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const forward = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const next = list[i + (forward ? 1 : -1)];
    if (i < 0 || !next) return;
    e.preventDefault();
    range({ order: list, id: next });
    // The next box in THIS list: the same id is drawn in the grid and in the
    // selection drawer, and the first match in the document may be the other.
    const root = e.currentTarget.closest("[data-select-scope]") ?? document;
    root.querySelector<HTMLInputElement>(`[data-select-id="${CSS.escape(next)}"] input`)?.focus();
  };

  return (
    // A <label> 24px square around the 14px box (WCAG 2.5.8): a click
    // anywhere in it is a click on the input, modifier keys included. The
    // negative margin keeps its footprint the box's own, so rows don't move.
    <label
      data-part="select"
      data-select-id={id}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center justify-center shrink-0 w-6 h-6 -m-[0.3125rem] cursor-pointer transition-opacity ${
        checked || active
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100"
      } ${className}`}
    >
      <input
        type="checkbox"
        data-component="Checkbox"
        checked={checked}
        onChange={() => {}}
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-label={`Select ${title}`}
        className="w-3.5 h-3.5 rounded cursor-pointer shrink-0 accent-ink"
      />
    </label>
  );
}
