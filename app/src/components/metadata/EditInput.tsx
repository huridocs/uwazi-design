import { useState } from "react";

/**
 * A small labelled text input. Controlled when `onChange` is given (parent owns
 * the value — used for edit-at-source, where each keystroke writes the atom);
 * otherwise it keeps its own throwaway state (used for the inline PDF/geo inputs
 * in the metadata editor that don't persist yet).
 */
export function EditInput({
  label,
  value,
  placeholder,
  onChange,
  ltr,
}: {
  label?: string;
  value: string;
  placeholder?: string;
  onChange?: (v: string) => void;
  /** Keep the value left-to-right (filenames, numbers) under RTL. */
  ltr?: boolean;
}) {
  const [internal, setInternal] = useState(value);
  const controlled = onChange !== undefined;
  const val = controlled ? value : internal;

  return (
    <div className="flex-1">
      {label && <span className="text-xs text-ink-tertiary">{label}</span>}
      <input
        type="text"
        value={val}
        dir={ltr ? "ltr" : undefined}
        onChange={(e) => (controlled ? onChange!(e.target.value) : setInternal(e.target.value))}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-sm text-ink bg-paper border border-border rounded-md
          focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40
          placeholder:text-ink-muted"
      />
    </div>
  );
}
