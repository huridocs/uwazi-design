import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pdfThumb } from "../../utils/pdfThumb";

/** The width the loupe draws the whole page at, in CSS px. A judgment's 11–12pt
 *  body text on a 612pt page comes to ~13px at this width, which reads; the
 *  zoom is this over the thumbnail's own width, so it is the same reading
 *  scale in a narrow card and a wide one. Never less than ×1.6. */
const PAGE_W = 680;
const MIN_ZOOM = 1.6;
/** Loupe diameter in CSS px: about seven lines of body text at that zoom. */
const SIZE = 136;

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

/** A round magnifier over a document thumbnail.
 *
 *  The thumbnail is rasterised at its own box width, too small to read, so the
 *  first time the pointer enters the page a render at `PAGE_W` is queued and the
 *  loupe appears only once it has arrived. The loupe is portaled to the body and
 *  positioned `fixed`, so no card, grid or scroller can clip it; it is clamped to
 *  the viewport. Position is written to the DOM directly, so moving the pointer
 *  re-renders nothing.
 *
 *  Decorative (`aria-hidden`, no pointer events): the card's own button and
 *  keyboard behaviour are untouched. Mouse only; touch has no hover. */
export function usePageLoupe(url: string | null | undefined) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lensRef = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const host = useRef<HTMLElement | null>(null);
  const frame = useRef(0);

  const place = useCallback(() => {
    const img = imgRef.current;
    const lens = lensRef.current;
    const p = last.current;
    if (!img || !lens || !p) return;
    // Only over the page as drawn: hit testing honours the sheet's clip, so
    // the part of the page hidden in the band never shows, and a page that a
    // re-layout moved out from under a still pointer hides the lens.
    const hit = document.elementFromPoint(p.x, p.y);
    if (!hit || !host.current?.contains(hit)) {
      lens.style.visibility = "hidden";
      return;
    }
    lens.style.visibility = "";
    const r = img.getBoundingClientRect();
    const ZOOM = Math.max(MIN_ZOOM, PAGE_W / r.width);
    const x = p.x - r.left;
    const y = p.y - r.top;
    const half = SIZE / 2;
    const left = Math.min(Math.max(p.x - half, 4), window.innerWidth - SIZE - 4);
    const top = Math.min(Math.max(p.y - half, 4), window.innerHeight - SIZE - 4);
    lens.style.transform = `translate(${left}px, ${top}px)`;
    // The point under the pointer sits at the lens's centre, even when the
    // lens is pushed off-centre by the viewport clamp.
    lens.style.backgroundSize = `${r.width * ZOOM}px auto`;
    lens.style.backgroundPosition = `${p.x - left - x * ZOOM}px ${p.y - top - y * ZOOM}px`;
  }, []);

  const onPointerEnter = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse" || !url || !finePointer()) return;
      const img = imgRef.current;
      if (!img) return;
      last.current = { x: e.clientX, y: e.clientY };
      host.current = e.currentTarget;
      setOver(true);
      if (!src) {
        const imgW = img.getBoundingClientRect().width;
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
          }}
        />,
        document.body,
      )
    : null;

  return { imgRef, lens, handlers: { onPointerEnter, onPointerMove, onPointerLeave } };
}
