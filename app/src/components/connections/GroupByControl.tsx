import { useAtom, type WritableAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  groupByAtom,
  subGroupByAtom,
  type GroupBy,
} from "../../atoms/filters";
import { groupingOptions } from "../../utils/connectionGrouping";

interface Props {
  /** "primary" drives groupByAtom (label "Group by:"); "secondary" drives
   *  subGroupByAtom and shows as "Then by:". */
  axis?: "primary" | "secondary";
  size?: "sm" | "md";
  /** When true, the control is rendered but inert (greyed out). */
  disabled?: boolean;
}

/** Dropdown selecting a grouping axis. Reuses the same options list for both
 *  the primary and secondary axes. */
export function GroupByControl({
  axis = "primary",
  size = "md",
  disabled = false,
}: Props) {
  const atom: WritableAtom<GroupBy, [GroupBy], void> =
    axis === "primary" ? groupByAtom : subGroupByAtom;
  const [value, setValue] = useAtom(atom);
  const [open, setOpen] = useState(false);
  const h = size === "sm" ? "h-6" : "h-8";
  const active = groupingOptions.find((o) => o.id === value);
  const labelPrefix = axis === "primary" ? "Group by:" : "Then by:";

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
        <span className="text-ink-tertiary">{labelPrefix}</span>
        <span>{active?.label ?? "None"}</span>
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
            aria-label={labelPrefix}
            className="absolute top-full left-0 mt-1 z-20 bg-paper border border-border rounded-md shadow-lg overflow-hidden min-w-[180px]"
          >
            {groupingOptions.map((opt) => (
              <button
                key={opt.id}
                role="option"
                aria-selected={value === opt.id}
                onClick={() => {
                  setValue(opt.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                  value === opt.id
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
