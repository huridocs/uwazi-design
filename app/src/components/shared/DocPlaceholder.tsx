import type { ReactNode } from "react";

/** The preview FRAME: a sheet of paper pinned near the top and running off the
 *  bottom edge, so the page is partially hidden the way one sits in a stack.
 *
 *  What fills the sheet is the caller's business — `DocumentPreview` puts the
 *  document's real first page in it. On its own it's the empty state: a blank
 *  sheet, no invented ruled lines. Those lines were a drawing of a document
 *  pretending to be the document, identical on every card, and they read as a
 *  wireframe that never loaded. */
export function DocPlaceholder({
  ext,
  size = "md",
  fill = false,
  peek = false,
  children,
}: {
  /** e.g. "pdf". Hidden at `sm` — there's no room, and a 5px word is noise. */
  ext?: string;
  size?: "sm" | "md" | "lg";
  /** The sheet IS the box: no inset, no stack framing.
   *
   *  For the portrait slot, where the box is already 3:4 and a page is ~0.77 —
   *  near enough the same shape that insetting a second, smaller sheet inside it
   *  draws a page floating in vellum with nothing gained. The stack framing
   *  earns its keep in the wide band, where a page CAN'T fill the box and the
   *  inset is what stops it reading as a crop; here it is just a smaller page. */
  fill?: boolean;
  /** On hover (or keyboard focus inside) of the nearest `group` — the library
   *  card — the sheet slides UP to show more of the page, as if pulled out of a
   *  folder, and settles back on leave. Stack frame only (never with `fill`).
   *
   *  The sheet is then TALLER than the band (170% of it) so there is page below
   *  the fold to reveal, and it moves by a transform, so the band and the card
   *  never change size. The travel is 30% of the SHEET, which is about half the
   *  band at every size — the move scales with the band without a size table.
   *  The page bitmap is the whole first page at the sheet's width, so what the
   *  reveal uncovers is already painted. Off under reduced motion. */
  peek?: boolean;
  /** Page content. Absent → a blank sheet. */
  children?: ReactNode;
}) {
  return (
    <div
      data-component="DocPlaceholder"
      className="group relative w-full h-full overflow-hidden bg-vellum"
    >
      {/* Inset at the sides, pinned near the top, running PAST the bottom so the
          frame crops it. Rounded on the top corners only — the bottom is
          off-frame, and rounding it would put the sheet back inside the box.

          The side inset is 6%, not 16%. At 16 the sheet was two thirds of the
          band's width — measured 250px of a 371px card — and the remaining third
          was vellum on either side of a page too small to read. The framing is
          what stops a fitted page reading as a crop, and it does that job at a
          hairline's remove as well as at a margin's; the margin was only ever
          sized for a 96px band. The sheet is still a sheet: same top anchor,
          same run off the bottom edge, same border and shadow. */}
      <div
        data-part="sheet"
        className={
          fill
            ? "absolute inset-0 bg-paper overflow-hidden"
            : peek
              ? `absolute inset-x-[6%] top-[10%] h-[170%] bg-paper rounded-t-[3px] shadow-sm overflow-hidden
                 transition-transform duration-300 ease-out will-change-transform
                 motion-safe:group-hover:-translate-y-[30%] motion-safe:group-focus-within:-translate-y-[30%]`
              : "absolute inset-x-[6%] top-[10%] -bottom-[15%] bg-paper rounded-t-[3px] shadow-sm overflow-hidden"
        }
        style={fill ? undefined : { border: "1px solid var(--border-soft)" }}
      >
        {children}
      </div>

      {/* Folder pocket: a small elliptical shadow pooled along the bottom, over the
          sheet, so the page reads as tucked INTO the frame — a radial gradient
          gives the ellipse, which an inset box-shadow can't. Only on hover, and
          faint: a flourish when you're looking at this one, not a permanent mark on
          every thumbnail. */}
      <div
        data-part="pocket"
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[14%] opacity-0 transition-opacity duration-200 ${
          // The pocket is the stack's shadow. A filled sheet has no bottom edge
          // to be tucked behind, so the gradient would just be a smudge.
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
