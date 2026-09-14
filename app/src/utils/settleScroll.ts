/** Scroll an element into view and keep it there while the layout around it
 *  settles.
 *
 *  One `scrollIntoView` is not enough when the content above the target is
 *  still changing height: the metadata record's masonry gives every card a
 *  1px span until its first measure, and image cards resolve their height
 *  from an aspect ratio. So `observe` (the box whose size changes) is watched,
 *  and the scroll is issued again on every resize for `followMs`. Smooth
 *  throughout, so a repeat retargets the animation in flight.
 *
 *  The operation owns its observer, listeners and timers. It used to live in
 *  the caller's effect, and the caller clears its request atom inside that
 *  effect, so the re-run's cleanup disconnected the observer within a
 *  millisecond of creating it. Following ends only when:
 *  - `followMs` runs out,
 *  - the user scrolls or presses a key (wheel, touch, keyboard). The smooth
 *    scroll still in flight is halted too, since it would otherwise carry on
 *    to its destination against the reader's own scroll,
 *  - a newer settle-scroll starts, or
 *  - the returned cancel function is called (the caller's unmount).
 *
 *  `onLand` runs once, when the scroll arrives: on the first `scrollend` of a
 *  box that contains the element, or 100ms in if nothing has scrolled (the
 *  element was already in place). Landing does not end following; a resize
 *  after it still re-issues the scroll. If no `scrollend` arrives (a browser
 *  without the event, a hidden tab), `onLand` runs `landMs` after following
 *  ends. It does not run for an operation that was cancelled or replaced. */

const USER_INPUT = ["wheel", "touchstart", "keydown"] as const;

/** Cancels the settle-scroll currently running, if any. */
let cancelCurrent: (() => void) | null = null;

export function settleScrollTo(
  el: HTMLElement,
  observe: Element,
  {
    followMs = 700,
    landMs = 800,
    onLand,
  }: { followMs?: number; landMs?: number; onLand?: () => void } = {},
): () => void {
  cancelCurrent?.();

  let following = true;
  let landing = true;
  /** The boxes this operation has scrolled, to halt them on user input. */
  const scrolled = new Set<Element>();

  const scroll = () => {
    if (!el.isConnected) return cancel();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Scroll events do not bubble, so these listen in the capture phase and keep
  // only the scrolls of a box that contains the element.
  const boxOf = (e: Event): Element | null => {
    if (e.target === document) return document.scrollingElement;
    return e.target instanceof Element && e.target.contains(el) ? e.target : null;
  };
  const onScroll = (e: Event) => {
    const box = boxOf(e);
    if (box) scrolled.add(box);
  };
  const onScrollEnd = (e: Event) => {
    if (boxOf(e)) land();
  };
  const onUserInput = () => {
    // An instant scroll to where a box already is replaces its smooth scroll
    // in flight, so the page stops where the reader is. Without it Chrome
    // carries the smooth scroll on to its destination. Either way Chrome drops
    // the one wheel tick that arrives during a programmatic smooth scroll.
    for (const box of scrolled) {
      box.scrollTo({ top: box.scrollTop, left: box.scrollLeft, behavior: "instant" });
    }
    stopFollowing();
    land();
  };

  const ro = new ResizeObserver(() => {
    if (following) scroll();
  });

  function finishIfDone() {
    if (following || landing) return;
    document.removeEventListener("scroll", onScroll, true);
    for (const type of USER_INPUT) window.removeEventListener(type, onUserInput, true);
    if (cancelCurrent === cancel) cancelCurrent = null;
  }

  function stopFollowing() {
    if (!following) return;
    following = false;
    ro.disconnect();
    window.clearTimeout(followTimer);
    finishIfDone();
  }

  function stopLanding() {
    if (!landing) return;
    landing = false;
    window.clearTimeout(noScrollTimer);
    window.clearTimeout(landTimer);
    document.removeEventListener("scrollend", onScrollEnd, true);
    finishIfDone();
  }

  function land() {
    if (!landing) return;
    stopLanding();
    onLand?.();
  }

  function cancel() {
    stopLanding();
    stopFollowing();
  }

  document.addEventListener("scroll", onScroll, true);
  document.addEventListener("scrollend", onScrollEnd, true);
  for (const type of USER_INPUT) {
    window.addEventListener(type, onUserInput, { capture: true, passive: true });
  }

  cancelCurrent = cancel;
  scroll();
  ro.observe(observe);

  const noScrollTimer = window.setTimeout(() => {
    if (scrolled.size === 0) land();
  }, 100);
  let landTimer: number | undefined;
  const followTimer = window.setTimeout(() => {
    stopFollowing();
    if (landing) landTimer = window.setTimeout(land, landMs);
  }, followMs);

  return cancel;
}
