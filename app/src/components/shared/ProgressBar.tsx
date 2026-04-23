interface ProgressBarProps {
  value: number;
  color?: "green" | "blue" | "red" | "gray";
  showLabel?: boolean;
  size?: "sm" | "md";
}

const fillColor = {
  green: "bg-success",
  blue: "bg-carbon",
  red: "bg-seal",
  gray: "bg-ink-muted/40",
};

const trackColor = {
  green: "bg-success/15",
  blue: "bg-carbon/15",
  red: "bg-seal/15",
  gray: "bg-warm",
};

export function ProgressBar({ value, color = "green", showLabel = false, size = "sm" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const h = size === "sm" ? "h-1" : "h-2";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex-1 ${h} rounded-sm ${trackColor[color]} overflow-hidden`}>
        <div
          className={`h-full rounded-sm ${fillColor[color]} transition-all duration-300`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-medium text-ink-tertiary tabular-nums shrink-0 w-8 text-right">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
