import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "./Checkbox";

interface FacetSectionProps {
  title: string;
  total: number;
  entries: [string, number][];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  label: (id: string) => string;
  renderMarker?: (id: string) => ReactNode;
  defaultExpanded?: boolean;
}

export function FacetSection({
  title,
  total,
  entries,
  selected,
  onToggle,
  label,
  renderMarker,
  defaultExpanded = true,
}: FacetSectionProps) {
  const [open, setOpen] = useState(defaultExpanded);
  const activeCount = entries.reduce(
    (sum, [id, c]) => sum + (selected[id] ? c : 0),
    0,
  );

  return (
    <div style={{ borderBottom: "1px solid var(--border-soft)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-warm transition-colors cursor-pointer"
      >
        <ChevronDown
          size={12}
          className={`text-ink-tertiary shrink-0 transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
        <span className="text-xs font-semibold text-ink-secondary">{title}</span>
        <span className="ml-auto text-[11px] text-ink-tertiary tabular-nums">
          {activeCount > 0 ? `${activeCount}/${total}` : total}
        </span>
      </button>
      {open && (
        <div className="pb-2">
          {entries.map(([id, count]) => {
            const checked = !!selected[id];
            return (
              <label
                key={id}
                className="flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-warm transition-colors"
              >
                <Checkbox
                  checked={checked}
                  onChange={() => onToggle(id)}
                  ariaLabel={label(id)}
                />
                {renderMarker?.(id)}
                <span className="text-xs text-ink-secondary truncate flex-1">
                  {label(id)}
                </span>
                <span className="text-[11px] text-ink-tertiary tabular-nums shrink-0">
                  {count}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
