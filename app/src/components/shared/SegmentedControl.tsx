import type { LucideIcon } from "lucide-react";

export interface Segment {
  id: string;
  label: string;
  icon?: LucideIcon;
}

/** The app's view-modifier toggle: a bordered segmented group with dividers and
 *  a vellum active segment. Used by the Relationships view controls and the
 *  Library cards/list toggle. Icon-only when `icon` is given, else the label. */
export function SegmentedControl({
  value,
  options,
  onChange,
  size = "md",
  ariaLabel,
}: {
  value: string;
  options: Segment[];
  onChange: (id: string) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const h = size === "sm" ? "h-6" : "h-8";
  const iconSize = size === "sm" ? 11 : 14;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex w-fit items-center rounded-md overflow-hidden ${h}`}
      style={{ border: "1px solid var(--border-primary)" }}
    >
      {options.map((opt, i) => {
        const active = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            aria-label={opt.label}
            title={opt.label}
            className={`flex items-center justify-center ${h} px-2 transition-colors cursor-pointer ${
              active ? "bg-vellum text-ink" : "text-ink-tertiary hover:text-ink-secondary"
            }`}
            style={{ borderLeft: i > 0 ? "1px solid var(--border-primary)" : "none" }}
          >
            {Icon ? <Icon size={iconSize} /> : <span className="text-xs font-medium px-0.5">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
