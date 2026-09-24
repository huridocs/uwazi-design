/** The intent behind a library card's page peek (`.doc-peek-sheet`).
 *
 *  The page rises only when the pointer RESTS on the thumbnail band: 380ms of
 *  stillness over it, with no scroll or wheel in the last 150ms. Scrolling a
 *  grid with the pointer over it sweeps it across dozens of thumbnails, and a
 *  page lifting under every one of them was the thing to avoid. Leaving the
 *  band cancels a pending rise and settles a raised page at once; a scroll
 *  does both too, because a raised page with the grid moving under it is a
 *  page hovering over the wrong card.
 *
 *  State is a `data-peek` attribute on the CARD, written directly: `up` while
 *  raised, `settling` for the 300ms it takes to come back down (so the card
 *  keeps its z-lift and the page doesn't drop under its neighbour mid-way).
 *  No React state, so a hover re-renders nothing in a memoised grid of 120.
 *
 *  Keyboard is CSS only (`:focus-visible` inside the card), no delay: tabbing
 *  onto a card is already a deliberate stop. */

const INTENT_MS = 380;
const QUIET_MS = 150;
const SETTLE_MS = 320;

let lastScrollAt = 0;
let installed = false;
const pending = new Map<HTMLElement, number>();
const settling = new Map<HTMLElement, number>();
const raised = new Set<HTMLElement>();

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const onScroll = () => {
    lastScrollAt = performance.now();
    // A pending rise starts its wait again; a raised page comes down.
    for (const [card, t] of pending) {
      window.clearTimeout(t);
      pending.set(card, window.setTimeout(() => fire(card), INTENT_MS));
    }
    for (const card of raised) settle(card);
  };
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("wheel", onScroll, { passive: true });
}

/** How far the sheet may rise and still be seen: the space between its rest
 *  top and the top of the scroll container it sits in, less a small margin.
 *  Read at the REST position, so a re-entry mid-animation measures the same
 *  room. A card at the top of the scroller rises only this far. */
export function measurePeekRoom(card: HTMLElement) {
  const slot = card.querySelector<HTMLElement>('[data-part="preview"]');
  if (!slot) return;
  let scroller = card.parentElement;
  while (scroller && !/(auto|scroll|hidden)/.test(getComputedStyle(scroller).overflowY)) {
    scroller = scroller.parentElement;
  }
  const s = slot.getBoundingClientRect();
  const restTop = s.top + s.height * 0.1;
  const top = scroller ? scroller.getBoundingClientRect().top : 0;
  card.style.setProperty("--peek-room", `${Math.max(0, restTop - top - 8)}px`);
}

function fire(card: HTMLElement) {
  pending.delete(card);
  const quietFor = performance.now() - lastScrollAt;
  if (quietFor < QUIET_MS) {
    pending.set(card, window.setTimeout(() => fire(card), QUIET_MS - quietFor));
    return;
  }
  const t = settling.get(card);
  if (t) window.clearTimeout(t);
  settling.delete(card);
  measurePeekRoom(card);
  card.dataset.peek = "up";
  raised.add(card);
}

function settle(card: HTMLElement) {
  raised.delete(card);
  if (card.dataset.peek !== "up") return;
  card.dataset.peek = "settling";
  settling.set(
    card,
    window.setTimeout(() => {
      settling.delete(card);
      if (card.dataset.peek === "settling") delete card.dataset.peek;
    }, SETTLE_MS),
  );
}

/** The pointer entered the thumbnail band. Mouse only: touch has no hover. */
export function peekEnter(e: React.PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const card = e.currentTarget.closest<HTMLElement>('[data-component="EntityCard"]');
  if (!card) return;
  install();
  const t = pending.get(card);
  if (t) window.clearTimeout(t);
  pending.set(card, window.setTimeout(() => fire(card), INTENT_MS));
}

/** The pointer left the band (the raised page is inside it, so moving onto the
 *  page is not leaving). Cancel a pending rise; settle a raised page now. */
export function peekLeave(e: React.PointerEvent<HTMLElement>) {
  const card = e.currentTarget.closest<HTMLElement>('[data-component="EntityCard"]');
  if (!card) return;
  const t = pending.get(card);
  if (t) window.clearTimeout(t);
  pending.delete(card);
  settle(card);
}
