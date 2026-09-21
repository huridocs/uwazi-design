import { forwardRef, type ReactNode } from "react";

/** The header of a main pane — ONE anatomy for the Library and the entity view.
 *
 *    row 1  IDENTITY (what this page is: a title, and the line under or over it)
 *           then the PRIMARY zone (the one control the page is for: the Library's
 *           search box, the entity's rendition picker)
 *    row 2  the page's VIEWS as a `MainTabs` strip, then the SECONDARY controls
 *           (arrange · display · language)
 *
 *  ONE FOLD RULE. Identity never folds. The primary zone drops to its own line
 *  under the identity when the two no longer fit. Secondary controls leave the
 *  row before the tabs have to; past that the tabs fold themselves into one
 *  select (`useStripFold`). Every step is decided by the header's own WIDTH,
 *  never by the viewport and never by state, so a query, a selection or a count
 *  cannot move anything in it.
 *
 *  Rendered inside a gutter host: no side padding of its own, `bleed` so its
 *  ground and bottom rule reach the pane edge. The rule sits under row 2, and the
 *  tab body below takes its gap from the host (`body-top`), as before. */
export const PaneHeader = forwardRef<
  HTMLElement,
  { children: ReactNode; ground?: "paper" | "parchment"; part?: string }
>(function PaneHeader({ children, ground = "paper", part }, ref) {
  return (
    <header
      ref={ref}
      data-component="PaneHeader"
      data-part={part}
      className={`bleed shrink-0 pt-2 pb-2 ${ground === "parchment" ? "bg-parchment" : "bg-paper"}`}
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      {children}
    </header>
  );
});
