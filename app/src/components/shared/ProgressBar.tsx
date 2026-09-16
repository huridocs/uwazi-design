interface ProgressBarProps {
  value: number;
  color?: "green" | "blue" | "red" | "gray";
  showLabel?: boolean;
  size?: "sm" | "md";
  /** Accessible name for the bar. Defaults to "Progress". */
  ariaLabel?: string;
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

export function ProgressBar({
  value,
  color = "green",
  showLabel = false,
  size = "sm",
  ariaLabel = "Progress",
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const h = size === "sm" ? "h-1" : "h-2";

  return (
    <div data-component="ProgressBar" className="flex items-center gap-2 w-full">
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        data-part="track"
        className={`flex-1 ${h} rounded-sm ${trackColor[color]} overflow-hidden`}
      >
        <div
          data-part="fill"
          className={`h-full rounded-sm ${fillColor[color]} transition-all duration-300`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        // The bar already announces its value; the printed % is for sight.
        <span
          data-part="label"
          aria-hidden
          className="text-meta font-medium text-ink-tertiary tabular-nums shrink-0 w-8 text-right"
        >
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
