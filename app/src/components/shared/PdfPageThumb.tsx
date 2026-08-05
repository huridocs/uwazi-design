import { useEffect, useRef, useState } from "react";
import { pdfThumb } from "../../utils/pdfThumb";
import { DocPlaceholder } from "./DocPlaceholder";

/** How much larger than fit-to-width page one is rendered before the sheet crops
 *  it, and how much air sits above the first line of type.
 *
 *  Treatment B, picked from rendered candidates. Fitted whole, a judgment's
 *  masthead is present but not readable; at 1.35 the court, the case name and
 *  the date all read while the page still reads as a PAGE — the side margins
 *  stay in frame, so it is a document seen closer rather than a fragment. That
 *  distinction is the whole point: 1.8 was legible too, and was rejected on
 *  sight because it cropped into the text block and lost the page.
 *
 *  0.20 of air, above the measured start of the page's own ink. These documents
 *  open on anywhere from 8.8% to 35.2% of blank margin, so the crop is pinned to
 *  where the type actually begins and then given a deliberate margin back —
 *  without it the masthead sits against the top edge, which is the first thing
 *  that was asked to change. */
const ZOOM = 1.35;
const TOP_AIR = 0.2;

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
  }, [visible, url, size]);

  useEffect(() => {
    if (!visible || !url) return;
    // Rasterise at the SHEET's real width — guessing renders the page blurry (too
    // small) or burns worker time (too big).
    // The height matters as much as the width: it is the crop window the page is
    // framed into, not just the box the bitmap lands in.
    const w = Math.round(sheetRef.current?.clientWidth ?? 0);
    const h = Math.round(sheetRef.current?.clientHeight ?? 0);
    if (!w || !h) return;
    let live = true;
    // At `sm` the sheet is ~24px across. Nothing is legible there at any zoom,
    // and a whole page at least reads as a page — so the framing is for the
    // sizes that can carry it.
    pdfThumb(url, w, size === "sm" ? undefined : { aspect: w / h, zoom: ZOOM, pad: TOP_AIR }).then(
      (data) => {
        if (live) setSrc(data);
      },
    );
    return () => {
      live = false;
    };
  }, [visible, url, size]);

  return (
    <div className={className} style={style}>
      <DocPlaceholder ext={ext} size={size}>
        {/* The ref is on the SHEET, not the frame: its width is what the page gets
            rendered at, and it's what has to come on screen. */}
        <div ref={sheetRef} className="w-full h-full">
          {src &&
            (size === "sm" ? (
              // Whole page, fitted to the sheet's width and running off its
              // bottom the way a page in a stack does.
              <img src={src} alt="" aria-hidden className="w-full block" />
            ) : (
              // The bitmap IS the sheet's box, so it fills it exactly.
              // `object-cover`/`object-top` only guard the sub-pixel rounding
              // between the CSS box and the integer canvas — the geometry is the
              // placeholder's either way, so nothing moves when it lands.
              <img
                src={src}
                alt=""
                aria-hidden
                className="w-full h-full block object-cover object-top"
              />
            ))}
        </div>
      </DocPlaceholder>
    </div>
  );
}
