import type { ReactNode } from "react";

export interface RadioOption {
  id: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  /** Not choosable now; the group's caller says why. */
  disabled?: boolean;
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
      data-component="RadioGroup"
      aria-label={ariaLabel}
      className={inline ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}
    >
      {options.map((opt) => {
        const checked = value === opt.id;
        return (
          <label
            key={opt.id}
            data-part="option"
            data-disabled={opt.disabled || undefined}
            className={`flex items-start gap-2.5 rounded-lg border bg-paper px-3 py-2.5 transition-colors ${
              opt.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            } ${checked ? "border-ink" : opt.disabled ? "border-border" : "border-border hover:bg-warm"} ${
              inline ? "flex-1 min-w-[8rem]" : ""
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={checked}
              onChange={() => onChange(opt.id)}
              disabled={opt.disabled}
              aria-label={opt.label}
              className="w-3.5 h-3.5 mt-0.5 accent-ink cursor-pointer disabled:cursor-not-allowed shrink-0"
            />
            <span className="min-w-0">
              <span data-part="label" className="flex items-center gap-1.5 text-sm font-medium text-ink">
                {opt.icon}
                {opt.label}
              </span>
              {opt.hint && <span data-part="hint" className="block text-xs text-ink-tertiary">{opt.hint}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
