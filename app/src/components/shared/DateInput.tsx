import { useEffect, useRef, useState, type FocusEventHandler, type InputHTMLAttributes } from "react";
import { useAtomValue } from "jotai";
import { CalendarDays } from "lucide-react";
import { dateFormatAtom } from "../../atoms/settingsSingletons";
import { formatDateDisplay, parsePatternInput } from "../../utils/dateFormat";

/** A date field that reads and takes dates in the collection's format
 *  (Settings › Collection › "Default date format"), where a native date
 *  input would follow the browser's locale. The value in and out is
 *  `yyyy-mm-dd`, the native input's contract, so it replaces one directly.
 *  The calendar button opens the browser's own picker.
 *
 *  Typed text that is not a date in the pattern is kept as typed and not
 *  reported; on blur it returns to the last valid value. */
export function DateInput({
  value,
  onChange,
  id,
  className = "",
  onBlur,
  disabled,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  pickerLabel = "Open calendar",
}: {
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  /** Classes for the text field; the calendar button sits inside its end. */
  className?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: InputHTMLAttributes<HTMLInputElement>["aria-invalid"];
  pickerLabel?: string;
}) {
  const pattern = useAtomValue(dateFormatAtom);
  const shown = value ? formatDateDisplay(value, pattern) : "";
  const [text, setText] = useState(shown);
  const native = useRef<HTMLInputElement>(null);
  // An outside change (the picker, a fill, a discard) rewrites the text.
  useEffect(() => setText(shown), [shown]);

  return (
    <span data-component="DateInput" className="relative flex min-w-0 w-full" dir="ltr">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={pattern.toLowerCase()}
        value={text}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onChange={(e) => {
          setText(e.target.value);
          if (!e.target.value.trim()) return onChange("");
          const iso = parsePatternInput(e.target.value, pattern);
          if (iso) onChange(iso);
        }}
        onBlur={(e) => {
          if (text.trim() && !parsePatternInput(text, pattern)) setText(shown);
          onBlur?.(e);
        }}
        className={`${className} pe-8`}
      />
      <button
        type="button"
        aria-label={pickerLabel}
        disabled={disabled}
        onClick={() => {
          const el = native.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.focus();
          }
        }}
        className="absolute end-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-parchment cursor-pointer disabled:cursor-not-allowed"
      >
        <CalendarDays size={14} aria-hidden />
      </button>
      <input
        ref={native}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute end-0 bottom-0 w-px h-px opacity-0 pointer-events-none"
      />
    </span>
  );
}
