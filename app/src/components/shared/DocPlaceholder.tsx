import type { ReactNode } from "react";

/** The preview frame: a sheet pinned near the top and running off the bottom
 *  edge. The caller fills it (`PdfPageThumb` puts the real first page in it);
 *  empty, it is a blank sheet with no drawn placeholder lines, which read as a
 *  page that failed to load. */
export function DocPlaceholder({
  ext,
  size = "md",
  fill = false,
  peek = false,
  children,
}: {
  /** e.g. "pdf". Hidden at `sm`, where it would be too small to read. */
  ext?: string;
  size?: "sm" | "md" | "lg";
  /** The sheet fills the box: no inset, no stack framing. For the portrait slot,
   *  which is 3:4 against a page's ~0.77, so an inset sheet would only be a
   *  smaller page. The wide band keeps the inset so a page doesn't read as a crop. */
  fill?: boolean;
  /** On hover or focus-within of the library card, the sheet rises past the
   *  card's top edge and settles back on leave. Stack frame only, never with
   *  `fill`. The motion is in `index.css` (`.doc-peek-sheet`): a clip-path and
   *  a translate in step, which utilities can't express.
   *
   *  The band does not clip in this mode; the sheet's own clip-path keeps its
   *  bottom edge on the band's bottom while it rises. The sheet is 170% of the
   *  band tall and the bitmap is the whole first page, so the rise uncovers
   *  content that is already painted. */
  peek?: boolean;
  /** Page content. Absent → a blank sheet. */
  children?: ReactNode;
}) {
  return (
    <div
      data-component="DocPlaceholder"
      className={`group relative w-full h-full bg-vellum ${peek && !fill ? "rounded-[inherit]" : "overflow-hidden"}`}
    >
      {/* Inset at the sides, pinned near the top, running past the bottom so the
          frame crops it. Top corners rounded only: the bottom is off-frame.
          The side inset is 6%: a wider one leaves the page too small to read
          in a wide card. */}
      <div
        data-part="sheet"
        className={
          fill
            ? "absolute inset-0 bg-paper overflow-hidden"
            : peek
              ? "doc-peek-sheet absolute inset-x-[6%] top-[10%] h-[170%] bg-paper rounded-t-[3px] shadow-sm overflow-hidden"
              : "absolute inset-x-[6%] top-[10%] -bottom-[15%] bg-paper rounded-t-[3px] shadow-sm overflow-hidden"
        }
        style={fill ? undefined : { border: "1px solid var(--border-soft)" }}
      >
        {children}
      </div>

      {/* A faint elliptical shadow along the bottom, over the sheet, on hover only.
          A radial gradient, because an inset box-shadow can't draw an ellipse. */}
      <div
        data-part="pocket"
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[14%] opacity-0 transition-opacity duration-200 ${
          // A filled sheet has no bottom edge for the shadow to sit behind.
          fill ? "" : "group-hover:opacity-100"
        }`}
        style={{
          background:
            "radial-gradient(90% 100% at 50% 122%, rgba(0,0,0,0.13) 0%, rgba(0,0,0,0.04) 52%, transparent 78%)",
        }}
      />

      {ext && size !== "sm" && (
        <span
          data-part="extension"
          className="absolute bottom-1 end-1 px-1 py-px rounded-[2px] bg-ink/70 text-paper text-meta font-semibold uppercase tracking-wider leading-none"
        >
          {ext}
        </span>
      )}
    </div>
  );
}
