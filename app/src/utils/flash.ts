const FLASH = "flash-highlight";

/** How to end the flash currently running on an element, if any. */
const running = new WeakMap<HTMLElement, () => void>();

/** Flash an element with the shared `flash-highlight` keyframe (index.css).
 *
 *  The flash ends itself, not through the caller's effect cleanup: callers clear
 *  their request atom inside that effect, and the re-run would cancel the end and
 *  leave the class on. The class comes off on `animationend`, with a timeout as a
 *  backstop for when no animation runs (hidden tab, reduced motion). The timeout
 *  is keyed by element. Calling it on a flashing element restarts the flash. */
export function flashElement(el: HTMLElement, fallbackMs = 1100) {
  running.get(el)?.();

  el.classList.remove(FLASH);
  // Read layout so the browser sees the class removed before it is added
  // again; without this a repeated flash does not restart the animation.
  void el.offsetWidth;
  el.classList.add(FLASH);

  const end = () => {
    window.clearTimeout(timer);
    el.removeEventListener("animationend", onAnimationEnd);
    el.classList.remove(FLASH);
    if (running.get(el) === end) running.delete(el);
  };
  const onAnimationEnd = (e: AnimationEvent) => {
    // animationend bubbles: ignore animations on descendants.
    if (e.target === el && e.animationName === FLASH) end();
  };
  el.addEventListener("animationend", onAnimationEnd);
  const timer = window.setTimeout(end, fallbackMs);
  running.set(el, end);
}
