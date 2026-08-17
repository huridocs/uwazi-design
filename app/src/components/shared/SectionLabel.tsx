import type { ReactNode } from "react";

/** The small uppercase label that introduces a group of content — "Properties"
 *  above a card's field hits, "Document" above its page hits, "Tasks · 3" above
 *  the notification drawer's running work.
 *
 *  There were FOUR of these, all called `SectionLabel`, all doing this job, all
 *  written separately: `NotificationsDrawer`, `ResultsMainView`,
 *  `EntityResultCard` and `DocumentSearchBody`. They agreed on the size and the
 *  weight and on nothing else — three `tracking-wide` against one
 *  `tracking-wider`, two `text-ink-tertiary` against two `text-ink-muted` — and
 *  two of them sit one directory apart labelling the SAME two sections
 *  ("Properties" over "Document"), so a reader met both versions of one label
 *  by moving between the Library results and the document search. This is that
 *  label, once.
 *
 *  **`text-ink-tertiary`, not `-muted`.** At 10px these are small text by WCAG's
 *  measure and muted lands under AA on parchment — the same finding that moved
 *  the spine's year marks. Tertiary is the design system's quiet-but-readable
 *  step and clears it in both themes, so the two sites that were muted got
 *  slightly darker rather than the two that were tertiary getting lighter.
 *
 *  **Typography is fixed here; POSITION is the caller's.** `className` takes the
 *  box — padding, `sticky`, a background — because where a label sits is a fact
 *  about its container, while what it looks like is the thing that must not
 *  vary. Nothing in the class list a caller passes can reach the size, weight,
 *  tracking or colour, which is what stopped this from being one component in
 *  the first place. */
export function SectionLabel({
  icon,
  className = "",
  children,
}: {
  /** Optional leading glyph (the Results view's Tag / FileText marks). Drawn a
   *  step quieter than the words, so it reads as punctuation, not as content. */
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    // `flex`, so this is block-level and a caller's `sticky` + background paints
    // the full width — the notification drawer's section headers depend on it.
    <span
      className={`flex items-center gap-1.5 min-w-0 text-meta font-semibold uppercase
        tracking-wide text-ink-tertiary ${className}`}
    >
      {icon && (
        <span className="text-ink-muted shrink-0" aria-hidden>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
