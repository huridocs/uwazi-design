import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The focusable descendants, in document order. Hidden ones are skipped —
 *  `offsetParent` is null for anything `display:none` — except the currently
 *  focused element, which stays in the ring even if its container is animating. */
function focusablesIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/** Trap Tab focus inside the returned ref's element while `active`.
 *
 *  - Moves initial focus to the first focusable child (unless something inside
 *    already has focus, e.g. an `autoFocus` input).
 *  - Tab / Shift+Tab wrap at the edges instead of escaping to the page behind.
 *  - On deactivate, restores focus to whatever had it before the trap engaged
 *    (the trigger button), so keyboard users aren't dropped at the body.
 *
 *  Attach the ref to the overlay's PANEL (not the scrim). Works for overlays
 *  that stay mounted while hidden (slide-overs) and ones that unmount. */
export function useFocusTrap<T extends HTMLElement>(active: boolean, contentKey?: unknown) {
  const ref = useRef<T | null>(null);

  /* Initial focus is its OWN effect, and it re-runs when `contentKey` changes.
     A panel's content can arrive a tick after the trap activates — EntityOverlay
     mounts its body only once there is an entity to show — and on that first
     tick there is nothing focusable inside, so `focusables()[0]` was undefined
     and focus stayed out on the trigger. Keeping it separate from the trap
     effect matters: that one restores focus to the trigger on cleanup, which
     must not happen just because the content changed.

     The container itself is the fallback (give the panel `tabIndex={-1}`), so a
     dialog with no focusable child still takes focus rather than leaving the
     reader outside it — and focus moves on to the first real control as soon as
     one exists. */
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const focused = document.activeElement;
    if (container.contains(focused) && focused !== container) return;
    // preventScroll: this fires while a slide-over is still translated
    // off-pane, and a plain focus() scrolls the overflow-hidden pane sideways
    // to reach it — the pane then stays scrolled after the slide lands.
    (focusablesIn(container)[0] ?? container).focus({ preventScroll: true });
  }, [active, contentKey]);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const previous = document.activeElement as HTMLElement | null;

    const focusables = () => focusablesIn(container);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const current = document.activeElement;
      if (e.shiftKey) {
        if (current === first || !container.contains(current)) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (current === last || !container.contains(current)) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [active]);

  return ref;
}
