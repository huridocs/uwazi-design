interface CountBadgeProps {
  count: number;
}

export function CountBadge({ count }: CountBadgeProps) {
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-md bg-parchment text-ink-tertiary">
      {count}
    </span>
  );
}
