import { useAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { groupByAtom, type GroupBy } from "../../atoms/filters";

const options: { id: GroupBy; label: string }[] = [
  { id: "none", label: "None" },
  { id: "entity-type", label: "Target entity type" },
  { id: "relation-type", label: "Relation type" },
];

interface Props {
  size?: "sm" | "md";
  /** When true, the control is rendered but inert (greyed out). Used in tree
   *  and graph views where grouping is intrinsic / n/a; keeping the control
   *  in flow prevents a layout shift when toggling between views. */
  disabled?: boolean;
}

/** Dropdown selecting the grouping axis applied to list view. */
export function GroupByControl({ size = "md", disabled = false }: Props) {
  const [groupBy, setGroupBy] = useAtom(groupByAtom);
  const [open, setOpen] = useState(false);
  const h = size === "sm" ? "h-6" : "h-8";
  const active = options.find((o) => o.id === groupBy);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        className={`flex items-center gap-1 ${h} px-2 text-[11px] font-medium bg-warm border border-border rounded-md transition-colors ${
          disabled
            ? "text-ink-muted opacity-60 cursor-not-allowed"
            : "text-ink-secondary hover:bg-parchment hover:text-ink cursor-pointer"
        }`}
      >
        <span className="text-ink-tertiary">Group by:</span>
        <span>{groupBy === "none" ? "None" : active?.label}</span>
        <ChevronDown size={10} className="text-ink-muted" aria-hidden="true" />
      </button>
      {open && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            aria-label="Group by"
            className="absolute top-full left-0 mt-1 z-20 bg-paper border border-border rounded-md shadow-lg overflow-hidden min-w-[160px]"
          >
            {options.map((opt) => (
              <button
                key={opt.id}
                role="option"
                aria-selected={groupBy === opt.id}
                onClick={() => {
                  setGroupBy(opt.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                  groupBy === opt.id
                    ? "bg-vellum text-ink"
                    : "text-ink-secondary hover:bg-warm"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
