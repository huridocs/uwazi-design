import { useEffect, useRef, useState } from "react";
import { pdfThumb } from "../../utils/pdfThumb";
import { DocPlaceholder } from "./DocPlaceholder";

/** A document preview: the real first page, inside the cropped-sheet frame.
 *
 *  The page is rasterised only once the thumb is ON SCREEN — a library grid holds
 *  dozens of cards, and handing pdf.js dozens of documents up front would stall
 *  the grid to draw pictures nobody has scrolled to. `pdfThumb` then caches the
 *  bitmap per (url, width), so the fifty sample cards that share two stand-in
 *  judgments cost two renders.
 *
 *  Until — or unless — the page arrives, the frame holds a blank sheet: same
 *  geometry, so nothing shifts when the image lands, and no invented ruled lines
 *  pretending to be a document.
 */
export function PdfPageThumb({
  url,
  ext,
  size = "md",
  className = "",
  style,
}: {
  /** No url → the frame stays an empty sheet. That IS the placeholder. */
  url?: string | null;
  ext?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

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

  useEffect(() => {
    if (!visible || !url) return;
    // Rasterise at the SHEET's real width — guessing renders the page blurry (too
    // small) or burns worker time (too big).
    const w = Math.round(sheetRef.current?.clientWidth ?? 0);
    if (!w) return;
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
  }, [visible, url]);

  return (
    <div className={className} style={style}>
      <DocPlaceholder ext={ext} size={size}>
        {/* The ref is on the SHEET, not the frame: its width is what the page gets
            rendered at, and it's what has to come on screen. */}
        <div ref={sheetRef} className="w-full h-full">
          {/* Full width, natural height, running off the sheet's bottom the way
              a page in a stack does — the frame crops it. */}
          {src && <img src={src} alt="" aria-hidden className="w-full block" />}
        </div>
      </DocPlaceholder>
    </div>
  );
}
