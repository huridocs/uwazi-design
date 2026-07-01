import { ChangeEventHandler } from "react";

interface CheckboxProps {
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  /** Accent of the filled (checked) box. Default "ink" (app convention); the
   *  filter facets use "carbon" to match the canonical filter styling. */
  tone?: "ink" | "carbon";
}

export function Checkbox({
  checked,
  onChange,
  ariaLabel,
  disabled,
  className,
  tone = "ink",
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`w-3.5 h-3.5 rounded cursor-pointer shrink-0 ${
        tone === "carbon" ? "accent-carbon" : "accent-ink"
      } ${className ?? ""}`}
    />
  );
}
