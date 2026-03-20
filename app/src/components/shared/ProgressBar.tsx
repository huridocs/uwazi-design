interface ProgressBarProps {
  value: number;
  color?: "green" | "blue" | "red";
  showLabel?: boolean;
  size?: "sm" | "md";
}

const colorMap = {
  green: "bg-success",
  blue: "bg-carbon",
  red: "bg-seal",
};

export function ProgressBar({ value, color = "green", showLabel = false, size = "sm" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const h = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex-1 ${h} rounded-full bg-warm overflow-hidden`} style={{ border: "1px solid var(--border-primary)" }}>
        <div
          className={`${h} rounded-full ${colorMap[color]} transition-all duration-300`}
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
