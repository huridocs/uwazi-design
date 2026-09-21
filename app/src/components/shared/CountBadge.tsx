interface CountBadgeProps {
  count: number;
  /** What is counted ("passages", "fields"), printed after the number in the
   *  same box. Without it the badge is a bare number, as before. */
  unit?: string;
}

export function CountBadge({ count, unit }: CountBadgeProps) {
  return (
    <span data-component="CountBadge" className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-md bg-parchment text-ink-tertiary">
      {count.toLocaleString()}
      {unit && ` ${unit}`}
    </span>
  );
}
