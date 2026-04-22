import { X } from "lucide-react";

interface ActiveFilterChipProps {
  label: string;
  color?: string;
  onRemove: () => void;
}

export function ActiveFilterChip({ label, color, onRemove }: ActiveFilterChipProps) {
  return (
    <span
      className="inline-flex items-center gap-1 h-6 pl-1.5 pr-1 rounded text-[11px] font-medium text-ink-secondary"
      style={{
        backgroundColor: "color-mix(in srgb, var(--ink) 6%, var(--bg-surface))",
        border: "1px solid color-mix(in srgb, var(--ink) 14%, var(--bg-surface))",
      }}
    >
      {color && (
        <span
          className="shrink-0 rounded-[2px]"
          style={{ backgroundColor: color, width: 6, height: 6 }}
        />
      )}
      <span className="truncate max-w-[160px]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="shrink-0 flex items-center justify-center rounded-sm text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
        style={{ width: 16, height: 16 }}
      >
        <X size={10} />
      </button>
    </span>
  );
}
