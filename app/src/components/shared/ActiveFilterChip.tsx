import { X } from "lucide-react";

interface ActiveFilterChipProps {
  label: string;
  color?: string;
  onRemove: () => void;
}

export function ActiveFilterChip({ label, color, onRemove }: ActiveFilterChipProps) {
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
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="shrink-0 flex items-center justify-center w-4 h-4 rounded-sm text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
      >
        <X size={10} />
      </button>
    </span>
  );
}
