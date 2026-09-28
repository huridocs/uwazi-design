import { createContext, useContext, useEffect, useLayoutEffect, type KeyboardEvent, type MouseEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  libraryDrawnIdsAtom,
  entitySelectedAtom,
  rangeSelectionAtom,
  toggleSelectionAtom,
} from "../../atoms/library";

/* ── The order a Shift range runs over ────────────────────────────────────
   "From the anchor to here" means in the order the reader sees: the grid's
   loaded page, the timeline's dates, the Results ranking. Each view
   registers its drawn order when it commits (`useSelectionOrder`); a list
   drawn somewhere else at the same time (the selection or cluster drawer)
   scopes its own rows with `SelectionOrderScope`. Read at click time, so no
   card re-renders when the order changes. */
let viewOrder: readonly string[] = [];

/** Register the order the visible view draws its entities in, or `null` for
 *  a host that is not drawing the view right now. A layout effect, so only a
 *  committed render counts (a render React discards, such as a deferred
 *  value's interrupted pass, leaves no order behind) and it is in place
 *  before the browser paints anything to click. Only one mounted caller may
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
 *  page's text selection to the click: a Shift+click on a row selects a range
 *  of entities, not the text between the anchor and the row. The click still fires. */
export function holdTextSelection(e: MouseEvent) {
  if (e.shiftKey) e.preventDefault();
}

/** One entity's selection control, shared by cards, table rows, timeline
 *  lines, Results cards and drawer rows.
 *
 *  Not rendered in the Library: selection uses Cmd/Ctrl- and Shift-click (on
 *  touch, a long press or `librarySelectModeAtom`). It stays as a visually hidden, focusable
 *  checkbox named "Select <title>" for keyboard and screen-reader users; the row
 *  draws its focus ring (`FOCUS_RING_ON_SELECT`).
 *
 *  Keys: Space toggles; Shift+Space and Shift+Arrow extend the range and move
 *  focus along the view's order. Clicks stop here: the row's click is the preview. */
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
    // The next box in this list: the same id is drawn in the grid and in the
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
  "has-[[data-part=select]_input:focus-visible]:ring-2 has-[[data-part=select]_input:focus-visible]:ring-[var(--selected-ring)]",
  // Forced colors (Windows High Contrast) drop box-shadows and backgrounds, so
  // the ring and the parchment vanish. Outlines survive: selected is a solid
  // system-colour outline, focus a dashed one outside it.
  "forced-colors:has-[[data-part=select]_input:checked]:outline-2 forced-colors:has-[[data-part=select]_input:checked]:outline-[SelectedItem]",
  "forced-colors:has-[[data-part=select]_input:focus-visible]:outline-3 forced-colors:has-[[data-part=select]_input:focus-visible]:outline-dashed",
  "forced-colors:has-[[data-part=select]_input:focus-visible]:outline-offset-2 forced-colors:has-[[data-part=select]_input:focus-visible]:outline-[Highlight]",
].join(" ");

/** Selected: one look whatever else is true of the item, the parchment fill
 *  and a 2px carbon ring (a box-shadow, so no layout shift), focused or not.
 *  It overrides the preview's ink hairline. Focus on an unselected item is the
 *  same ring without the fill; on a selected item focus adds nothing. */
export const SELECTED_LOOK = [
  "has-[[data-part=select]_input:checked]:bg-parchment has-[[data-part=select]_input:checked]:border-border",
  "has-[[data-part=select]_input:checked]:ring-2 has-[[data-part=select]_input:checked]:ring-[var(--selected-ring)] has-[[data-part=select]_input:checked]:shadow-none",
].join(" ");
/** The same, drawn inside the box — for rows, whose neighbours touch them. */
export const SELECTED_LOOK_INSET = `${SELECTED_LOOK} has-[[data-part=select]_input:checked]:ring-inset`;

/** The previewed item, the one open in the drawer. Callers pair this ring
 *  with `bg-parchment`, so a single previewed item looks exactly like a
 *  selected one: one look for "this is the item you picked", however many
 *  are picked. Forced colors drop rings, so there it
 *  is a thin system-colour outline — thinner than selected's. */
export const PREVIEWED_RING =
  "ring-2 ring-[var(--selected-ring)] forced-colors:outline forced-colors:outline-1 forced-colors:outline-[CanvasText]";
/** The same, drawn inside the box — for rows. */
export const PREVIEWED_RING_INSET = `${PREVIEWED_RING} ring-inset forced-colors:-outline-offset-1`;

/* ── Touch ──────────────────────────────────────────────────────────────
   Selection is modifier-click, and a touch screen has no modifiers, so on
   touch a long press (500ms, without moving) toggles the item under the
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
