import { X } from "lucide-react";

interface ActiveFilterChipProps {
  label: string;
  color?: string;
  onRemove: () => void;
  /** Accessible name for the × when "Remove filter: …" is the wrong sentence —
   *  the search chip drops a search, not a facet. */
  removeLabel?: string;
}

export function ActiveFilterChip({ label, color, onRemove, removeLabel }: ActiveFilterChipProps) {
  return (
    <span
      className="inline-flex items-center gap-1 h-6 ps-1.5 pe-1 rounded text-[11px] font-medium text-ink-secondary"
      style={{
        backgroundColor: "color-mix(in srgb, var(--text-primary) 6%, var(--bg-surface))",
        border: "1px solid color-mix(in srgb, var(--text-primary) 14%, var(--bg-surface))",
      }}
    >
      {color && (
        <span
          className="shrink-0 rounded-[2px] w-1.5 h-1.5"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="truncate max-w-40">{label}</span>
      {/* The × is the only focusable thing here (the chip itself is a span), and it
          took the browser default. Same carbon halo as `ToggleChip` — solid carbon
          outline, 1px gap, no layout cost. At 3px of extension it clears the chip's
          own border and still sits inside the 4px `pe-1`, so nothing is clipped. */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel ?? `Remove filter: ${label}`}
        className="shrink-0 flex items-center justify-center w-4 h-4 rounded-sm text-ink-tertiary
          hover:text-ink transition-colors cursor-pointer focus-visible:outline-2
          focus-visible:outline-offset-1 focus-visible:outline-carbon"
      >
        <X size={10} />
      </button>
    </span>
  );
}
