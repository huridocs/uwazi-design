import { useEffect, useRef, useState } from "react";
import { pdfThumb } from "../../utils/pdfThumb";

/** Page one of a PDF as a thumbnail image.
 *
 *  Renders only once the thumb is ON SCREEN. A library grid holds dozens of
 *  cards, and handing pdf.js dozens of documents up front would stall the grid to
 *  draw pictures nobody has scrolled to. An IntersectionObserver with a screen of
 *  margin fetches roughly what you're about to look at; `pdfThumb` then caches the
 *  bitmap per (url, width), so revisits and shared files are free.
 *
 *  `fallback` sits underneath — it's the loading state AND the failure state, so a
 *  card is never a bare white rectangle. */
export function PdfPageThumb({
  url,
  width,
  className = "",
  style,
  fallback,
}: {
  url: string;
  width: number;
  className?: string;
  style?: React.CSSProperties;
  fallback: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
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
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    pdfThumb(url, width).then((data) => {
      if (live) setSrc(data);
    });
    return () => {
      live = false;
    };
  }, [visible, url, width]);

  return (
    <div ref={ref} style={style} className={`relative overflow-hidden bg-paper ${className}`}>
      <div className="absolute inset-0">{fallback}</div>
      {src && (
        // Anchored to the TOP: a page is portrait and the box is usually not, so
        // centring it would crop the masthead — the one part of a first page that
        // identifies the document.
        <img
          src={src}
          alt=""
          aria-hidden
          className="relative w-full block"
          loading="lazy"
        />
      )}
    </div>
  );
}
