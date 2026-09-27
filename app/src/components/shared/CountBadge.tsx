interface CountBadgeProps {
  count: number;
  /** What is counted ("passages", "fields"), printed after the number in the
   *  same box. Without it the badge is a bare number, as before. */
  unit?: string;
  /** The count in words ("123 references"), for a badge that shows a bare
   *  number: the tooltip, and what a screen reader hears in its place. */
  label?: string;
}

export function CountBadge({ count, unit, label }: CountBadgeProps) {
  return (
    <span data-component="CountBadge" title={label} className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-md bg-parchment text-ink-tertiary">
      <span aria-hidden={label ? true : undefined}>
        {count.toLocaleString()}
        {unit && ` ${unit}`}
      </span>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
