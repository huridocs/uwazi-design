import { useAtom } from "jotai";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { sortOrderAtom, type SortOrder } from "../../atoms/filters";

const options: { id: SortOrder; label: string }[] = [
  { id: "none", label: "None" },
  { id: "appearance", label: "Appearance" },
  { id: "asc", label: "A → Z" },
  { id: "desc", label: "Z → A" },
];

/** Dropdown selecting the sort order for the connections list/groups. */
export function SortControl({ size = "md" }: { size?: "sm" | "md" }) {
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const [open, setOpen] = useState(false);
  const h = size === "sm" ? "h-6" : "h-8";
  const active = options.find((o) => o.id === sortOrder);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center gap-1 ${h} px-2 text-[11px] font-medium text-ink-secondary bg-warm border border-border rounded-md hover:bg-parchment hover:text-ink transition-colors cursor-pointer`}
      >
        <span className="text-ink-tertiary">Sort:</span>
        <span>{active?.label}</span>
        <ChevronDown size={10} className="text-ink-muted" aria-hidden="true" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            aria-label="Sort order"
            className="absolute top-full left-0 mt-1 z-20 bg-paper border border-border rounded-md shadow-lg overflow-hidden min-w-[120px]"
          >
            {options.map((opt) => (
              <button
                key={opt.id}
                role="option"
                aria-selected={sortOrder === opt.id}
                onClick={() => {
                  setSortOrder(opt.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortOrder === opt.id
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
