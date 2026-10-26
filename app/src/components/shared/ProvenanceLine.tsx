import type { ReactNode } from "react";
import { CornerDownRight } from "lucide-react";

/** The `↳ …` provenance line — the app's one way of saying "what you are reading
 *  did not originate here".
 *
 *  Every surface that makes that statement makes it the same way: a snippet
 *  read from a connected record's document names it (`↳ from`), and Copy From
 *  names where a staged value came from (`↳ copied from`). Same corner glyph,
 *  same quiet 11px tertiary type, so a reader learns the mark once.
 *
 *  Purely presentational — the `label` is the verb and the children are whatever
 *  the surface points at (a plain title in the library, where the entity
 *  overlay isn't mounted to receive a click). */
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
