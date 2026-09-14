const FLASH = "flash-highlight";

/** How to end the flash currently running on an element, if any. */
const running = new WeakMap<HTMLElement, () => void>();

/** Flash an element with the shared `flash-highlight` keyframe (index.css).
 *
 *  The flash owns its own end. It used to be a timeout returned from the
 *  caller's effect cleanup, and every caller clears its request atom inside
 *  that same effect, so the re-run cancelled the timeout and the class stayed
 *  on the element. Here the class comes off on `animationend`, with a timeout
 *  as a backstop for when no animation runs (a hidden tab does not advance
 *  animations, and reduced-motion rules can remove them). The timeout is keyed
 *  by element and cleared only when that element flashes again.
 *
 *  Calling it on an element that is still flashing restarts the flash. */
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
