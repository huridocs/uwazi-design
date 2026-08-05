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
  triggerPrefix,
  steady = false,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  align?: "start" | "end";
  /** Names the axis in the trigger ("View: Cards") where the value alone would
   *  be ambiguous next to other dropdowns. Trigger only — the panel lists bare
   *  values, since an open panel already sits under its own trigger. */
  triggerPrefix?: string;
  /** Hold the width of the WIDEST option, so picking a shorter value can't
   *  shrink the control.
   *
   *  Off by default, and deliberately: a settings form's Select lists template
   *  names, and reserving the longest one would blow a 40-character label out
   *  across the form. It is the toolbar that needs this — Sort · View · Display
   *  · Language sit in one row, and a trigger that resizes with its value shoves
   *  every control beside it. (Measured before this existed: the Sort trigger
   *  swung 65.45px on "Title" to 112.67px on "Connections".) */
  steady?: boolean;
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
        // The transparent border is load-bearing: the menu below has a real 1px
        // one, so without a matching edge here the option labels sit a pixel
        // inboard of the trigger's. Same border + same px-3 on both = one text
        // column. `gap-1` because a 14px chevron carries ~3.5px of its own
        // slack — 6px of gap read as 9.5 and detached the caret from the label.
        className="inline-flex items-center gap-1 h-8 ps-3 pe-2 text-xs font-medium text-ink-secondary
          bg-warm border border-transparent hover:bg-parchment hover:text-ink rounded-md
          transition-colors cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
      >
        {/* Prefix and value are ONE run. As two loose spans they are two inline
            boxes, so an RTL page lays them end-to-start and "View: Cards"
            renders as "Cards :View". `<bdi>` resolves direction from its own
            first strong character, so a Latin pair stays Latin-ordered inside an
            RTL toolbar and a translated pair orders itself correctly too. */}
        <bdi className="flex items-center gap-1 min-w-0">
          {triggerPrefix && <span className="shrink-0 text-ink-tertiary">{triggerPrefix}</span>}
          {steady ? (
            // Every label laid out in ONE grid cell, only the current one
            // visible: the cell is as wide as the widest label RENDERS. A
            // `ch`-count reserve was the other way to do this and it guesses —
            // it over-reserved by up to 49px on the same font, which parks dead
            // space inside the trigger and pushes the caret off the label.
            <span className="grid min-w-0">
              {options.map((o) => (
                <span
                  key={o.value}
                  // The four that aren't showing are spacers, not content — the
                  // button is named by `aria-label`, and an AT user should never
                  // meet "CardsListMapTimelineResults".
                  aria-hidden={o.value !== current?.value}
                  className={`col-start-1 row-start-1 truncate text-start ${
                    o.value === current?.value ? "" : "invisible"
                  }`}
                >
                  {o.label}
                </span>
              ))}
            </span>
          ) : (
            <span className="truncate">{current?.label}</span>
          )}
        </bdi>
        <ChevronDown size={14} className={`text-ink-tertiary shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          // No blanket 10rem floor: it was three times the Language trigger, so
          // that panel hung far past its control and stranded EN/ES/FR/AR at the
          // start of a box nothing lined up with. The options size it now, which
          // is the same text the trigger is sized from.
          className={`absolute z-30 top-full mt-1 w-max min-w-full rounded-md bg-paper border border-border
            py-1 animate-fade-in-up ${align === "end" ? "end-0" : "start-0"}`}
          style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}
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
