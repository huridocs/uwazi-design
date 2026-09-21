import { createContext, useContext, useEffect, useLayoutEffect, type KeyboardEvent, type MouseEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  libraryDrawnIdsAtom,
  entitySelectedAtom,
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

/** One entity's selection control — the same control in a card, a table
 *  row, a timeline line, a Results card and a drawer row.
 *
 *  NOT DRAWN (Juan, 2026-09-21): the Library selects by modifier click —
 *  Cmd/Ctrl toggles, Shift ranges — and selected is the row's `bg-parchment`,
 *  so a visible checkbox on every card was a second way to say the same thing,
 *  and a slot every card paid for. What stays is the ACCESSIBLE route: a real
 *  `<input type="checkbox">`, visually hidden but focusable, named "Select
 *  <title>", a tab stop after the row's primary action. While it has focus
 *  the ROW draws the focus ring (`FOCUS_RING_ON_SELECT`), since the box itself
 *  can't be seen. Screen readers get its checked state.
 *
 *  Keys: Space toggles (native); Shift+Space and Shift+Arrow extend the range
 *  from the anchor, the arrow moving focus to the next one in the view's
 *  order. Clicks stop here — the row's own click is the preview. */
export function EntitySelectBox({ id, title }: { id: string; title: string }) {
  const checked = useAtomValue(entitySelectedAtom(id));
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
    <span data-part="select" data-select-id={id} onClick={(e) => e.stopPropagation()} className="sr-only">
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
    </span>
  );
}

/** The row's focus ring while its hidden selection checkbox has focus — the
 *  one visible sign of where a keyboard user is. Put on every host row. */
export const FOCUS_RING_ON_SELECT = [
  "has-[[data-part=select]_input:focus-visible]:ring-2 has-[[data-part=select]_input:focus-visible]:ring-carbon/30",
  // Forced colors (Windows High Contrast) drop box-shadows AND backgrounds,
  // which were both signals — the ring and the parchment. Outlines survive:
  // SELECTED is a solid system-colour outline, FOCUS a dashed one outside it.
  "forced-colors:has-[[data-part=select]_input:checked]:outline-2 forced-colors:has-[[data-part=select]_input:checked]:outline-[SelectedItem]",
  "forced-colors:has-[[data-part=select]_input:focus-visible]:outline-3 forced-colors:has-[[data-part=select]_input:focus-visible]:outline-dashed",
  "forced-colors:has-[[data-part=select]_input:focus-visible]:outline-offset-2 forced-colors:has-[[data-part=select]_input:focus-visible]:outline-[Highlight]",
].join(" ");

/** The PREVIEWED item — the one open in the drawer. Selected owns
 *  bg-parchment; a previewed item that looked the same made the selection
 *  unreadable (four parchment cards, "3 selected"). The preview is an ink
 *  hairline instead: no new colour, and it survives forced colors. */
export const PREVIEWED_EDGE = "border-ink";

/* ── Touch ──────────────────────────────────────────────────────────────
   Selection is modifier-click, and a touch screen has no modifiers — so on
   touch a LONG PRESS (500ms, without moving) toggles the item under the
   finger, and while a selection exists a plain tap toggles too (the
   convention of every touch file manager). The item is whatever carries a
   hidden selection box: `[data-select-id]` inside the pressed card or row. */
let lastPointerType = "mouse";
/** The pointer that started the latest interaction — a click event doesn't
 *  say (Safari's `click` has no `pointerType`). */
export const lastPointerWasTouch = () => lastPointerType === "touch";

const LONG_PRESS_MS = 500;
const SLOP_PX = 10;

function itemIdAt(target: EventTarget | null): string | null {
  let el = target instanceof Element ? target : null;
  while (el) {
    const box = el.querySelector?.(":scope > [data-select-id], :scope > * > [data-select-id]") as HTMLElement | null;
    if (box?.dataset.selectId) return box.dataset.selectId;
    if (el.matches("[data-select-scope], [data-gutter-host]")) return null;
    el = el.parentElement;
  }
  return null;
}

/** Install the long-press (while mounted). `toggle` is the selection toggle. */
export function useTouchSelection(toggle: (id: string) => void) {
  useEffect(() => {
    let timer = 0;
    let start: { x: number; y: number } | null = null;
    let fired = false;
    const cancel = () => {
      window.clearTimeout(timer);
      start = null;
    };
    const onDown = (e: PointerEvent) => {
      lastPointerType = e.pointerType;
      fired = false;
      if (e.pointerType !== "touch") return;
      const id = itemIdAt(e.target);
      if (!id) return;
      start = { x: e.clientX, y: e.clientY };
      timer = window.setTimeout(() => {
        fired = true;
        start = null;
        toggle(id);
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS);
    };
    const onMove = (e: PointerEvent) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP_PX) cancel();
    };
    // The click that ends a long press is not also a tap (a preview).
    const onClick = (e: Event) => {
      if (!fired) return;
      fired = false;
      e.preventDefault();
      e.stopPropagation();
    };
    // Mobile browsers open a context menu on a long press; not on an item.
    const onContext = (e: Event) => {
      if (lastPointerType === "touch" && itemIdAt(e.target)) e.preventDefault();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", cancel, true);
    document.addEventListener("pointercancel", cancel, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("contextmenu", onContext, true);
    return () => {
      cancel();
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", cancel, true);
      document.removeEventListener("pointercancel", cancel, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("contextmenu", onContext, true);
    };
  }, [toggle]);
}
