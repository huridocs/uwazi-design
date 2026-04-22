import { ChangeEventHandler } from "react";

interface CheckboxProps {
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  ariaLabel,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`w-3.5 h-3.5 rounded accent-ink cursor-pointer shrink-0 ${className ?? ""}`}
    />
  );
}
