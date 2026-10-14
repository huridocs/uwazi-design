interface CountBadgeProps {
  count: number;
  /** What is counted ("passages", "fields"), printed after the number in the
   *  same box. Without it the badge is a bare number, as before. */
  unit?: string;
  /** The count in words ("123 references"), for a badge that shows a bare
   *  number: the tooltip, and what a screen reader hears in its place. */
  label?: string;
}

/** One line, never wrapped and never squeezed: beside a long title it is the
 *  title that truncates ("1 / field" on two lines was the failure). */
export function CountBadge({ count, unit, label }: CountBadgeProps) {
  return (
    <span data-component="CountBadge" title={label} className="inline-flex shrink-0 items-center justify-center min-w-[20px] h-5 px-1.5 whitespace-nowrap text-xs font-medium rounded-md bg-parchment text-ink-tertiary">
      <span aria-hidden={label ? true : undefined}>
        {count.toLocaleString()}
        {unit && ` ${unit}`}
      </span>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
