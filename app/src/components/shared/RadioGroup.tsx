import type { ReactNode } from "react";

export interface RadioOption {
  id: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
}

interface RadioGroupProps {
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (id: string) => void;
  ariaLabel?: string;
  /** Lay the options out in a row instead of stacking them. */
  inline?: boolean;
}

/** A single-choice control. Native radio inputs (accent-ink, like Checkbox)
 *  with a label + optional hint, selectable by clicking the whole row. Use for
 *  picking one setting value — not for navigation (that's tabs). */
export function RadioGroup({
  name,
  value,
  options,
  onChange,
  ariaLabel,
  inline = false,
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={inline ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}
    >
      {options.map((opt) => {
        const checked = value === opt.id;
        return (
          <label
            key={opt.id}
            className={`flex items-start gap-2.5 rounded-lg border bg-paper px-3 py-2.5 cursor-pointer transition-colors ${
              checked ? "border-ink" : "border-border hover:bg-warm"
            } ${inline ? "flex-1 min-w-[8rem]" : ""}`}
          >
            <input
              type="radio"
              name={name}
              checked={checked}
              onChange={() => onChange(opt.id)}
              aria-label={opt.label}
              className="w-3.5 h-3.5 mt-0.5 accent-ink cursor-pointer shrink-0"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                {opt.icon}
                {opt.label}
              </span>
              {opt.hint && <span className="block text-xs text-ink-tertiary">{opt.hint}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
