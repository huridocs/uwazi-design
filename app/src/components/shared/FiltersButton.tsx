import { Filter } from "lucide-react";
import { TOOL_BUTTON, TOOL_BUTTON_ON, TOOL_SHAPE } from "./toolButton";

interface FiltersButtonProps {
  activeCount: number;
  onClick: () => void;
  size?: "sm" | "md";
  label?: string;
}

export function FiltersButton({
  activeCount,
  onClick,
  size = "md",
  label = "Filters",
}: FiltersButtonProps) {
  const active = activeCount > 0;
  const h = size === "sm" ? "h-6" : "h-8";
  const px = size === "sm" ? "px-2" : "px-2.5";
  const iconSize = size === "sm" ? 11 : 12;
  const textSize = size === "sm" ? "text-meta" : "text-xs";

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      data-component="FiltersButton"
      // Resting hover is a background tint only — no border darkening, no
      // shadow. The lift read as the button rising off a flat toolbar, and it
      // also blurred the line with ACTIVE, which is what the shadow means here:
      // hovering an inactive Filters button looked a lot like the state that
      // says filters are on. Active keeps its shadow and its ink border; only
      // hover gave them up, so the two states now differ at a glance.
      // The toolbar control (`toolButton.ts`).
      className={`${TOOL_SHAPE} gap-1.5 ${h} ${px} ${textSize} font-medium ${active ? TOOL_BUTTON_ON : TOOL_BUTTON}`}
    >
      <Filter size={iconSize} data-part="icon" aria-hidden className={active ? "text-ink" : "text-ink-secondary"} />
      <span data-part="label">{label}</span>
      {active && (
        <span
          data-part="count"
          className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-ink text-paper text-meta font-semibold leading-none tabular-nums"
        >
          {activeCount}
        </span>
      )}
    </button>
  );
}
