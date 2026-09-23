/** A hairline between groups of actions in a bar (count / bulk actions /
 *  danger). Decorative: the groups need no announced boundary. */
export function BarDivider({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`shrink-0 self-center h-5 w-px mx-1.5 bg-border-soft ${className}`} />;
}
