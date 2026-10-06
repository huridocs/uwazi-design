import { useEffect, type RefObject } from "react";

/** Keeps the control a reader clicked at the same place on screen while the
 *  scroller's content re-renders under it. A facet toggle changes counts in
 *  other cards; the cards keep their shape (see LibraryFilters), and this is
 *  the guard for whatever still changes height above the click.
 *
 *  On a click inside the scroller, the clicked row's top is recorded; for the
 *  next 600ms each frame scrolls by however far it moved. React commits a
 *  click's update before the next frame, so the correction lands before paint.
 *  A wheel, touch or key press hands the scroller back to the reader. The
 *  listeners sit on the document and read `ref` at click time, so a scroller
 *  that mounts later (a sheet's body) is covered. */
export function useKeepClickedInPlace(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    let raf = 0;
    const stop = () => cancelAnimationFrame(raf);
    const onClick = (ev: Event) => {
      const scroller = ref.current;
      const target = (ev.target as Element | null)?.closest?.<HTMLElement>("label, button");
      if (!scroller || !target || !scroller.contains(target)) return;
      const top = target.getBoundingClientRect().top;
      const until = performance.now() + 600;
      stop();
      const tick = () => {
        if (target.isConnected) {
          const moved = target.getBoundingClientRect().top - top;
          if (Math.abs(moved) >= 0.5) scroller.scrollTop += moved;
        }
        if (performance.now() < until) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("wheel", stop, { passive: true });
    document.addEventListener("touchstart", stop, { passive: true });
    document.addEventListener("keydown", stop);
    return () => {
      stop();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("wheel", stop);
      document.removeEventListener("touchstart", stop);
      document.removeEventListener("keydown", stop);
    };
  }, [ref]);
}
