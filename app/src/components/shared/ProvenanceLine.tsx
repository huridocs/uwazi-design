import type { ReactNode } from "react";
import { CornerDownRight } from "lucide-react";

/** The `↳ …` provenance line — the app's one way of saying "what you are reading
 *  did not originate here".
 *
 *  Two surfaces make that statement about different things and must make it the
 *  same way: metadata's inherited values name the hops a value was reached
 *  through (`↳ via Sentencia X`, {@link ProvenanceTrail}), and the library's
 *  search results name the document a passage was quoted from (`↳ from Sentencia
 *  X`, {@link BorrowedDocLine}). Same corner glyph, same quiet 11px tertiary
 *  type, so a reader learns the mark once.
 *
 *  Purely presentational — the `label` is the verb and the children are whatever
 *  the surface points at (clickable hops in metadata, a plain title in the
 *  library, where the entity overlay isn't mounted to receive a click). */
export function ProvenanceLine({
  label,
  children,
  /** `inline-flex` instead of `flex`, for riding an existing line of text (a
   *  section label, a row's attribution) rather than occupying one. */
  inline = false,
  className = "",
}: {
  label: string;
  children: ReactNode;
  inline?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`${inline ? "inline-flex" : "flex"} items-center gap-1 min-w-0
        text-meta font-normal normal-case tracking-normal text-ink-tertiary ${className}`}
    >
      <CornerDownRight size={10} className="shrink-0 text-ink-muted" aria-hidden />
      <span className="shrink-0">{label}</span>
      {children}
    </span>
  );
}
