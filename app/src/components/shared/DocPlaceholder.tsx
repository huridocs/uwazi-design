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
  children,
}: {
  /** e.g. "pdf". Hidden at `sm` — there's no room, and a 5px word is noise. */
  ext?: string;
  size?: "sm" | "md" | "lg";
  /** Page content. Absent → a blank sheet. */
  children?: ReactNode;
}) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-vellum">
      {/* Inset at the sides, pinned near the top, running PAST the bottom so the
          frame crops it. Rounded on the top corners only — the bottom is
          off-frame, and rounding it would put the sheet back inside the box. */}
      <div
        className="absolute inset-x-[16%] top-[10%] -bottom-[15%] bg-paper rounded-t-[3px] shadow-sm overflow-hidden"
        style={{ border: "1px solid var(--border-soft)" }}
      >
        {children}
      </div>

      {/* Folder pocket: a whisper of an elliptical shadow pooled along the bottom,
          over the sheet, so the page reads as tucked INTO the frame — a radial
          gradient gives the ellipse, which an inset box-shadow can't. Kept
          extremely subtle: a hint you notice only if you look, not a smudge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background:
            "radial-gradient(130% 100% at 50% 112%, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.04) 45%, transparent 72%)",
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
