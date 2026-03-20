interface StatsCardProps {
  label: string;
  value: string | number;
  accent?: "green" | "blue" | "red" | "amber";
}

const accentBorder = {
  green: "var(--success)",
  blue: "var(--accent-blue)",
  red: "var(--accent-seal)",
  amber: "var(--warning)",
};

export function StatsCard({ label, value, accent }: StatsCardProps) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 rounded-lg bg-paper"
      style={{
        border: "1px solid var(--border-primary)",
        borderLeft: accent ? `3px solid ${accentBorder[accent]}` : undefined,
      }}
    >
      <span className="text-[11px] font-medium text-ink-tertiary uppercase tracking-wider">{label}</span>
      <span className="text-xl font-semibold text-ink tabular-nums">{value}</span>
    </div>
  );
}
