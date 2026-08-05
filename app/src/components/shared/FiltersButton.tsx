import { Filter } from "lucide-react";

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
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`relative inline-flex items-center gap-1.5 ${h} ${px} ${textSize} font-medium rounded-md transition-all cursor-pointer ${
        active
          ? "bg-paper text-ink border border-ink/40 shadow-sm"
          : "bg-paper border border-border text-ink-secondary hover:border-ink/25 hover:text-ink hover:shadow-sm"
      }`}
    >
      <Filter size={iconSize} className={active ? "text-ink" : "text-ink-secondary"} />
      <span>{label}</span>
      {active && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-ink text-paper tabular-nums"
          style={{
            minWidth: 14,
            height: 14,
            padding: "0 4px",
            fontSize: 9,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {activeCount}
        </span>
      )}
    </button>
  );
}
