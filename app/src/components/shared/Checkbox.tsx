import { useEffect, useRef, type ChangeEventHandler } from "react";

interface CheckboxProps {
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  /** Accent of the filled (checked) box. Default "ink" (app convention); the
   *  filter facets use "carbon" to match the canonical filter styling. */
  tone?: "ink" | "carbon";
  /** Mixed: some of what this box stands for is ticked (a select-all over a
   *  partial selection). A DOM property with no attribute, so set by ref. */
  indeterminate?: boolean;
  /** The id of help text describing the box. */
  describedBy?: string;
  id?: string;
}

export function Checkbox({
  checked,
  onChange,
  ariaLabel,
  disabled,
  className,
  tone = "ink",
  indeterminate = false,
  describedBy,
  id,
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      data-component="Checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      id={id}
      disabled={disabled}
      className={`w-3.5 h-3.5 rounded cursor-pointer shrink-0 ${
        tone === "carbon" ? "accent-carbon" : "accent-ink"
      } ${className ?? ""}`}
    />
  );
}
