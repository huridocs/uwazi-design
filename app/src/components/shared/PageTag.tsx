interface PageTagProps {
  page: number;
  /** Omit for a page tag that only STATES the page. With a handler it becomes
   *  the control that goes there. */
  onClick?: (e: React.MouseEvent) => void;
}

const BOX =
  "inline-flex items-center px-1.5 py-0.5 text-xs font-mono rounded bg-vellum text-ink-secondary";

/** The page a passage sits on — and, where it takes an `onClick`, the way to it.
 *
 *  Two things it does as a control. It names itself "Go to page N" rather than
 *  leaving a screen reader to read "p.14" as prose. And it stops the click from
 *  propagating, because a page tag lives inside a row: going to the passage and
 *  whatever the row does are two different intentions, and one press must not be
 *  both.
 *
 *  Without a handler it is a `<span>`, not a disabled-looking button — a button
 *  that does nothing is a tab stop that wastes a keyboard user's time. */
export function PageTag({ page, onClick }: PageTagProps) {
  if (!onClick) {
    return <span className={BOX}>p.{page}</span>;
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      aria-label={`Go to page ${page}`}
      className={`${BOX} hover:bg-border hover:text-ink transition-colors cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40`}
    >
      p.{page}
    </button>
  );
}
