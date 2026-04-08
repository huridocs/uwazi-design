interface StatsCardProps {
  label: string;
  value: string | number;
  accent?: "green" | "blue" | "red" | "amber";
}

const accentColor = {
  green: "var(--success)",
  blue: "var(--accent-blue)",
  red: "var(--accent-seal)",
  amber: "var(--warning)",
};

export function StatsCard({ label, value, accent }: StatsCardProps) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 rounded-lg bg-paper"
      style={{ border: "1px solid var(--border-primary)" }}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-tertiary uppercase tracking-wider">
        {accent && (
          <span
            className="w-1.5 h-1.5 rounded-[1px] shrink-0"
            style={{ backgroundColor: accentColor[accent] }}
          />
        )}
        {label}
      </span>
      <span className={`text-xl font-semibold tabular-nums ${accent ? "text-ink" : "text-ink-tertiary"}`}>
        {value}
      </span>
    </div>
  );
}
