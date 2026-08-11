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
  /** Page content. Absent → a blank sheet. */
  children?: ReactNode;
}) {
  return (
    <div className="group relative w-full h-full overflow-hidden bg-vellum">
      {/* Inset at the sides, pinned near the top, running PAST the bottom so the
          frame crops it. Rounded on the top corners only — the bottom is
          off-frame, and rounding it would put the sheet back inside the box. */}
      <div
        className={
          fill
            ? "absolute inset-0 bg-paper overflow-hidden"
            : "absolute inset-x-[16%] top-[10%] -bottom-[15%] bg-paper rounded-t-[3px] shadow-sm overflow-hidden"
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
        <span className="absolute bottom-1 end-1 px-1 py-px rounded-[2px] bg-ink/70 text-paper text-[8px] font-semibold uppercase tracking-wider leading-none">
          {ext}
        </span>
      )}
    </div>
  );
}
