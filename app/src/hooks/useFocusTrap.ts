import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const previous = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    if (!container.contains(document.activeElement)) {
      focusables()[0]?.focus();
    }

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
          last.focus();
        }
      } else if (current === last || !container.contains(current)) {
        e.preventDefault();
        first.focus();
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
