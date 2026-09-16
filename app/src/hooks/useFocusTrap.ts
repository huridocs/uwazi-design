import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The focusable descendants, in document order. Hidden ones are skipped — an
 *  element under `display:none` has no client rects — except the currently
 *  focused element, which stays in the ring even if its container is animating.
 *
 *  Not `offsetParent`: that is null for every `position: fixed` element too, so
 *  the lightbox's fixed Close button (its only control) was left out of the ring
 *  and Tab walked out of the dialog. */
function focusablesIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 || el === document.activeElement,
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

  /* The element to give focus back to, captured in the RENDER where `active`
     turns true — before React commits. Any later is too late: an `autoFocus`
     child (Bert's composer) takes focus during the commit, and the initial-focus
     effect below moves it into the panel before the trap effect runs. Reading
     `document.activeElement` there captured an element INSIDE the overlay, which
     is unmounted or inert by the time the trap releases, so the restore failed
     silently and focus fell to <body>. Reading (not writing) the DOM during
     render is safe to repeat, so a discarded or doubled render captures the same
     trigger. */
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasActiveRef = useRef(false);
  /** Whether the trap effect is currently mounted — see the restore below. */
  const trappingRef = useRef(false);
  if (active && !wasActiveRef.current) {
    const el = document.activeElement;
    triggerRef.current = el instanceof HTMLElement && el !== document.body ? el : null;
  }
  wasActiveRef.current = active;

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

    const focusInitial = () => {
      const focused = document.activeElement;
      if (container.contains(focused) && focused !== container) return;
      // preventScroll: this fires while a slide-over is still translated
      // off-pane, and a plain focus() scrolls the overflow-hidden pane sideways
      // to reach it — the pane then stays scrolled after the slide lands.
      (focusablesIn(container)[0] ?? container).focus({ preventScroll: true });
    };

    /* A slide-over that stays mounted is `inert` while closed, and the host
       clears that in its OWN effect — which can run after this one (the order
       of effects is the order of the calls, and nothing here can see it). The
       browser drops focus() into an inert subtree without a word, so focusing
       now does nothing and nothing retries. Wait for the attribute to go. */
    const inertHost = container.closest<HTMLElement>("[inert]");
    if (!inertHost) {
      focusInitial();
      return;
    }
    const observer = new MutationObserver(() => {
      if (inertHost.hasAttribute("inert")) return;
      observer.disconnect();
      focusInitial();
    });
    observer.observe(inertHost, { attributes: true, attributeFilter: ["inert"] });
    return () => observer.disconnect();
  }, [active, contentKey]);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const trigger = triggerRef.current;
    trappingRef.current = true;

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
      trappingRef.current = false;
      /* Restore once the commit settles, and only if the trap did not come
         straight back. StrictMode runs an overlay that mounts open (the Copy
         From picker) through mount → cleanup → mount; restoring in that fake
         cleanup pulled focus out of the picker's autoFocus search box, and the
         remount then parked it on Close. A real close leaves the trap down. */
      queueMicrotask(() => {
        if (trappingRef.current) return;
        // Give focus back only if it is still ours to give: inside the panel,
        // or dropped to <body> because the panel unmounted. A close caused by
        // pressing something outside (the overlay's outside-click) leaves focus
        // on that thing, and taking it away would be the bug.
        const current = document.activeElement;
        const ours = !current || current === document.body || container.contains(current);
        if (trigger?.isConnected && ours) trigger.focus({ preventScroll: true });
      });
    };
  }, [active]);

  return ref;
}
