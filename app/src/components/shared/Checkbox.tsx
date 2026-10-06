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
  /** Unavailable but still announced: `aria-disabled`, focusable, and a
   *  click or Space does nothing. For a filter row whose count is 0, which a
   *  screen reader should still hear with its count. `disabled` removes the
   *  box from the tab order and from the accessibility tree's interactive set. */
  unavailable?: boolean;
  /** The id of help text describing the box. */
  describedBy?: string;
  id?: string;
}

export function Checkbox({
  checked,
  onChange,
  ariaLabel,
  disabled,
  unavailable = false,
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
      // React reports the change during the click, before the cancelled
      // default puts the box back, so the handler is dropped too.
      onChange={unavailable ? () => {} : onChange}
      // A click (Space fires one) is cancelled, so the box never changes.
      onClick={unavailable ? (e) => e.preventDefault() : undefined}
      aria-disabled={unavailable || undefined}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      id={id}
      disabled={disabled}
      className={`w-3.5 h-3.5 rounded shrink-0 ${unavailable ? "cursor-default! opacity-40" : "cursor-pointer"} ${
        tone === "carbon" ? "accent-carbon" : "accent-ink"
      } ${className ?? ""}`}
    />
  );
}
