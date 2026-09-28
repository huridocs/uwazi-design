import { useEffect } from "react";

/** How far a finger may travel and still be tapping, in CSS px. */
const TAP_SLOP_PX = 8;

/** Only a real TAP on a list item opens it — never the end of a scroll.
 *
 *  On a phone a card or row opens its entity in a sheet, and a vertical swipe
 *  that starts on a card is how you scroll the list. Browsers usually suppress
 *  the click after a native scroll, but not always (a short drag inside the
 *  slop, a fling that ends over another card, a nested scroller), and one stray
 *  open throws a sheet over the list mid-read. So for touch the guard decides:
 *  a gesture that moved more than {@link TAP_SLOP_PX}, scrolled anything, or was
 *  cancelled (`pointercancel`, which is how the browser says "this became a
 *  scroll") swallows the click that ends it — in capture, before React sees it.
 *
 *  Scoped to `[data-tap-guard]` containers (the Library's lanes). Mouse, pen and
 *  keyboard clicks (Enter/Space on the stretched primary button) are never
 *  touched: only a click that ends a touch gesture is inspected. */
export function useTapGuard() {
  useEffect(() => {
    let gesture: { x: number; y: number; moved: boolean } | null = null;
    const moved = () => {
      if (gesture) gesture.moved = true;
    };
    const onDown = (e: PointerEvent) => {
      gesture = e.pointerType === "touch" ? { x: e.clientX, y: e.clientY, moved: false } : null;
    };
    const onMove = (e: PointerEvent) => {
      if (gesture && Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > TAP_SLOP_PX) moved();
    };
    const onClick = (e: MouseEvent) => {
      const g = gesture;
      gesture = null;
      if (!g?.moved) return;
      if (!(e.target instanceof Element) || !e.target.closest("[data-tap-guard]")) return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointercancel", moved, true);
    // Any scroll during the gesture, in any scroller: `scroll` doesn't bubble,
    // so it is caught in capture on the document.
    document.addEventListener("scroll", moved, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointercancel", moved, true);
      document.removeEventListener("scroll", moved, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
}
