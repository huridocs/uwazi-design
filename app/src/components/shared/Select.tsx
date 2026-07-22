import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  /** Listed but not choosable — e.g. a language this entity has no translation
   *  for. Shown greyed rather than hidden: which languages EXIST is part of what
   *  the control tells you. */
  disabled?: boolean;
}

/** A calm, borderless dropdown matching the app's action style: bg-warm trigger
 *  with a controlled chevron (consistent caret padding) and a popover menu.
 *  Reusable wherever a native <select> would otherwise leak browser chrome. */
export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  align = "start",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="inline-flex items-center gap-1.5 h-8 ps-2.5 pe-2 text-xs font-medium text-ink-secondary bg-warm
          hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown size={14} className={`text-ink-tertiary shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className={`absolute z-30 top-full mt-1 min-w-[10rem] rounded-md bg-paper py-1 animate-fade-in-up ${
            align === "end" ? "end-0" : "start-0"
          }`}
          style={{ border: "1px solid var(--border-primary)", boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              disabled={o.disabled}
              onClick={() => {
                if (o.disabled) return;
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex items-center w-full px-3 py-1.5 text-xs text-start transition-colors ${
                o.disabled
                  ? "text-ink-muted/50 cursor-not-allowed"
                  : o.value === value
                    ? "bg-vellum text-ink font-semibold cursor-pointer"
                    : "text-ink-secondary hover:bg-warm cursor-pointer"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
