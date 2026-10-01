import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pdfThumb } from "../../utils/pdfThumb";
import { peekRaisedAt } from "../library/docPeek";

/** The width the loupe draws the whole page at, in CSS px. A judgment's 11–12pt
 *  body text on a 612pt page comes to ~13px at this width, which reads; the
 *  zoom is this over the thumbnail's own width, so it is the same reading
 *  scale in a narrow card and a wide one. Never less than ×1.6. */
const PAGE_W = 680;
const MIN_ZOOM = 1.6;
/** Loupe diameter in CSS px: about seven lines of body text at that zoom. */
const SIZE = 136;
/** A page that rises (`--lift`, 240ms in `index.css`) gets the loupe after
 *  the rise and then this beat, so it arrives after the page is up. A page that
 *  stays put, or any page under reduced motion, waits for the beat only. It
 *  fades in over `FADE_MS`. */
const RISE_MS = 240;
const BEAT_MS = 120;
const FADE_MS = 120;

/** Hi-res renders run one at a time. Sweeping the pointer across a row of
 *  cards would otherwise hand pdf.js one full-page render per card at once.
 *  Each (url, width) is queued once; `pdfThumb` caches the bitmap itself. */
let queue: Promise<unknown> = Promise.resolve();
const queued = new Map<string, Promise<string | null>>();
function hiRes(url: string, width: number) {
  const key = `${url}@${width}`;
  let p = queued.get(key);
  if (!p) {
    p = queue.then(() => pdfThumb(url, width));
    queue = p.catch(() => null);
    queued.set(key, p);
  }
  return p;
}

const finePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The page as drawn inside the `<img>` box. The stack frame's image is the
 *  box; the portrait slot's is `object-fit: cover` (or `contain` when matted)
 *  at `object-position: top`, so it can overhang or underfill the box. */
function drawnRect(img: HTMLImageElement) {
  const r = img.getBoundingClientRect();
  const fit = getComputedStyle(img).objectFit;
  if ((fit !== "cover" && fit !== "contain") || !img.naturalWidth || !img.naturalHeight) {
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  const s = (fit === "cover" ? Math.max : Math.min)(r.width / img.naturalWidth, r.height / img.naturalHeight);
  const width = img.naturalWidth * s;
  const height = img.naturalHeight * s;
  return { left: r.left + (r.width - width) / 2, top: r.top, width, height };
}

/** A round magnifier over a document thumbnail.
 *
 *  The thumbnail is rasterised at its own box width, too small to read, so the
 *  first time the pointer enters the page a render at `PAGE_W` is queued and the
 *  loupe appears only once it has arrived. With `rises` (the Small card's
 *  lift) it also waits for the page to be up: the card's rise (`docPeek.ts`),
 *  its 240ms, then a short beat. Re-entering a page that is already up shows it
 *  at once. A page that does not rise waits for the beat from the pointer
 *  entering. Either way it fades in, and leaving cancels the wait. The loupe is portaled to the body and positioned `fixed`, so no
 *  card, grid or scroller can clip it; it is clamped to the viewport. Position is written to the DOM directly, so moving the pointer
 *  re-renders nothing.
 *
 *  Decorative (`aria-hidden`, no pointer events): the card's own button and
 *  keyboard behaviour are untouched. Mouse only; touch has no hover. */
export function usePageLoupe(url: string | null | undefined, rises = false) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lensRef = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const host = useRef<HTMLElement | null>(null);
  const card = useRef<HTMLElement | null>(null);
  const enteredAt = useRef(0);
  const frame = useRef(0);

  /** Whether the page has been up long enough for the loupe. */
  const ready = useCallback(() => {
    // Without a card (a story) nothing raises the page on hover.
    const raised = rises && card.current;
    const wait = (raised && !reducedMotion() ? RISE_MS : 0) + BEAT_MS;
    const since = raised ? peekRaisedAt(raised) : enteredAt.current;
    return since != null && performance.now() - since >= wait;
  }, [rises]);

  const place = useCallback(() => {
    const img = imgRef.current;
    const lens = lensRef.current;
    const p = last.current;
    if (!img || !lens || !p) return;
    // Transparent until the page is up; the fade is the CSS transition.
    lens.style.opacity = ready() ? "1" : "0";
    // Only over the page as drawn: hit testing honours the sheet's clip, so
    // the part of the page hidden in the band never shows, and a page that a
    // re-layout moved out from under a still pointer hides the lens.
    const hit = document.elementFromPoint(p.x, p.y);
    const r = drawnRect(img);
    const x = p.x - r.left;
    const y = p.y - r.top;
    // A matted page leaves part of the box empty; there is nothing to magnify.
    if (!hit || !host.current?.contains(hit) || x < 0 || x > r.width || y < 0 || y > r.height) {
      lens.style.visibility = "hidden";
      return;
    }
    lens.style.visibility = "";
    const ZOOM = Math.max(MIN_ZOOM, PAGE_W / r.width);
    const half = SIZE / 2;
    const left = Math.min(Math.max(p.x - half, 4), window.innerWidth - SIZE - 4);
    const top = Math.min(Math.max(p.y - half, 4), window.innerHeight - SIZE - 4);
    lens.style.transform = `translate(${left}px, ${top}px)`;
    // The point under the pointer sits at the lens's centre, even when the
    // lens is pushed off-centre by the viewport clamp.
    lens.style.backgroundSize = `${r.width * ZOOM}px auto`;
    lens.style.backgroundPosition = `${p.x - left - x * ZOOM}px ${p.y - top - y * ZOOM}px`;
  }, [ready]);

  const onPointerEnter = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse" || !url || !finePointer()) return;
      const img = imgRef.current;
      if (!img) return;
      last.current = { x: e.clientX, y: e.clientY };
      host.current = e.currentTarget;
      card.current = e.currentTarget.closest<HTMLElement>('[data-component="EntityCard"]');
      enteredAt.current = performance.now();
      setOver(true);
      if (!src) {
        const imgW = drawnRect(img).width;
        const w = Math.ceil(Math.max(PAGE_W, imgW * MIN_ZOOM) / 32) * 32;
        hiRes(url, w).then((data) => data && setSrc(data));
      }
    },
    [url, src],
  );
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    last.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onPointerLeave = useCallback(() => {
    setOver(false);
    last.current = null;
  }, []);

  // A scroll or resize moves the page out from under a still pointer, and
  // no pointerleave follows; hide until the pointer enters again.
  useEffect(() => {
    if (!over) return;
    const hide = () => setOver(false);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("resize", hide);
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
      window.removeEventListener("blur", hide);
    };
  }, [over]);

  const show = over && !!src;
  // Placed every frame while shown, not only on pointer moves: the page rises
  // under a still pointer, and a lens placed from the rect before the rise
  // shows the wrong lines. One rect read per frame, only while hovering.
  // The first placement is before paint, so the lens never shows a frame at
  // the viewport's corner.
  useLayoutEffect(() => {
    if (!show) return;
    const tick = () => {
      place();
      frame.current = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame.current);
  }, [show, place]);

  const lens = show
    ? createPortal(
        <div
          ref={lensRef}
          data-component="PageLoupe"
          aria-hidden
          className="page-loupe pointer-events-none fixed top-0 left-0 z-50 rounded-full bg-paper bg-no-repeat"
          style={{
            width: SIZE,
            height: SIZE,
            backgroundImage: `url(${src})`,
            border: "1px solid var(--border-primary)",
            boxShadow: "var(--shadow-xl)",
            opacity: 0,
            transition: `opacity ${FADE_MS}ms ease-out`,
          }}
        />,
        document.body,
      )
    : null;

  return { imgRef, lens, handlers: { onPointerEnter, onPointerMove, onPointerLeave } };
}
