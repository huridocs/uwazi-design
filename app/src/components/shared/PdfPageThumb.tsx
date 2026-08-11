import { useEffect, useRef, useState } from "react";
import { pdfThumb } from "../../utils/pdfThumb";
import { DocPlaceholder } from "./DocPlaceholder";

/** A document preview: the real first page.
 *
 *  Two framings, decided by the slot it is handed:
 *   - the **wide band** keeps the cropped-sheet frame — a page can't fill a 3:1
 *     box, and the inset stack is what stops the fitted page reading as a crop;
 *   - the **portrait slot** is already 3:4, and a page is ~0.77, so the page
 *     FILLS it. Insetting a second sheet inside a box that is nearly the page's
 *     own shape drew a small document floating in vellum and gained nothing.
 *
 *  The page is rasterised only once the thumb is ON SCREEN — a library grid holds
 *  dozens of cards, and handing pdf.js dozens of documents up front would stall
 *  the grid to draw pictures nobody has scrolled to. `pdfThumb` then caches the
 *  bitmap per (url, width), so the fifty sample cards that share two stand-in
 *  judgments cost two renders. The two framings ask for different widths, so
 *  they land on different keys and neither hands the other its picture.
 *
 *  Until — or unless — the page arrives, the frame holds a blank sheet: same
 *  geometry, so nothing shifts when the image lands, and no invented ruled lines
 *  pretending to be a document.
 */
export function PdfPageThumb({
  url,
  ext,
  size = "md",
  fill = false,
  className = "",
  style,
}: {
  /** No url → the frame stays an empty sheet. That IS the placeholder. */
  url?: string | null;
  ext?: string;
  size?: "sm" | "md" | "lg";
  /** The page fills the box instead of sitting in the inset stack frame. */
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  /** The rendered page's own ratio (w/h), once the bitmap is decoded. */
  const [pageAspect, setPageAspect] = useState<number | null>(null);
  /** The width to rasterise at, in CSS px, QUANTISED to 32.
   *
   *  It follows the box, because the box moves: switching frame or size re-lays
   *  the grid under a mounted card, and an effect that only ran on mount left a
   *  221px bitmap stretched across a 371px portrait slot — soft in exactly the
   *  mode that exists to show the page bigger. Quantising keeps the cache to a
   *  handful of keys per document instead of one per pixel of column width. */
  const [renderW, setRenderW] = useState(0);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el || visible || !url) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, url]);

  // Measure the SHEET, and keep measuring: guessing renders the page blurry (too
  // small) or burns worker time (too big), and the right answer changes when the
  // grid re-hangs. `pdfThumb` multiplies by the device pixel ratio itself, so
  // this is CSS px and the retina pass is not this component's business.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const measure = () => {
      // `getBoundingClientRect`, not `clientWidth`: the portrait slot's width
      // comes from an aspect ratio against a fractional column, and the rounded
      // integer is up to a pixel short of what is actually painted.
      const boxW = el.getBoundingClientRect().width;
      // Filling a 3:4 box with a ~0.77 page means the page is scaled until its
      // HEIGHT covers, which draws it ~7% wider than the box. Rendering at the
      // box's width would then be upscaled by that much on screen — visible on
      // 6pt type. 0.8 is the widest portrait page this corpus holds, so
      // `height × 0.8` is the drawn width's ceiling; asking for it costs a few
      // percent of raster and never renders short.
      const boxH = el.getBoundingClientRect().height;
      const want = fill ? Math.max(boxW, boxH * 0.8) : boxW;
      if (!want) return;
      // Never step DOWN: a card that already holds a sharp bitmap gains nothing
      // from re-rendering it smaller, and the cache would keep both.
      setRenderW((prev) => Math.max(prev, Math.ceil(want / 32) * 32));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);

  useEffect(() => {
    if (!visible || !url || !renderW) return;
    const w = renderW;
    let live = true;
    // The WHOLE first page, fitted to that width. The masthead crop that stood
    // here — page zoomed 1.8× and cropped to the sheet — was rejected on sight:
    // legible, but it reads as a fragment jammed against the top edge rather
    // than as a document. A small honest page beats a big illegible detail, and
    // recognising "this is a court judgment" is what a card thumbnail is for.
    // `pdfThumb` keeps the framing path (and its cache key) so treatments can be
    // rendered and compared with `npm run check:thumbs`; nothing ships it.
    pdfThumb(url, w).then((data) => {
      if (live) setSrc(data);
    });
    return () => {
      live = false;
    };
  }, [visible, url, renderW]);

  // Filling: the same rule the picture thumbnails keep — a page that runs the
  // same way as the box covers it, and one that doesn't is matted rather than
  // butchered. A portrait page loses ~3% off the bottom; a landscape page (rare
  // here, but they exist) would lose a third of its width, so it sits whole on
  // the vellum ground instead. Anchored to the TOP because a page's masthead is
  // what identifies it — the trim comes off the footer.
  const matted = pageAspect !== null && pageAspect > 0.95;

  return (
    <div className={className} style={style}>
      <DocPlaceholder ext={ext} size={size} fill={fill}>
        {/* The ref is on the SHEET, not the frame: its width is what the page gets
            rendered at, and it's what has to come on screen. */}
        {/* `data-thumb-w` is the width the page was actually RASTERISED at, in
            CSS px. It exists to be read: "is this bitmap big enough for the box
            it's drawn in" is the one question about this component that a
            screenshot cannot answer, and it is exactly what went wrong when the
            portrait slot inherited the band's smaller render. */}
        <div ref={sheetRef} data-thumb-w={renderW || undefined} className="w-full h-full">
          {src &&
            (fill ? (
              <img
                src={src}
                alt=""
                aria-hidden
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalHeight) setPageAspect(img.naturalWidth / img.naturalHeight);
                }}
                className="w-full h-full"
                style={{ objectFit: matted ? "contain" : "cover", objectPosition: "top" }}
              />
            ) : (
              /* Full width, natural height, running off the sheet's bottom the
                 way a page in a stack does — the frame crops it. */
              <img src={src} alt="" aria-hidden className="w-full block" />
            ))}
        </div>
      </DocPlaceholder>
    </div>
  );
}
