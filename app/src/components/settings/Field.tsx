import type { InputHTMLAttributes, ReactNode } from "react";

/** Labelled form field wrapper for settings forms. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-medium text-ink-secondary">{label}</span>}
      {children}
      {error ? (
        <span className="text-xs text-seal">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-tertiary">{hint}</span>
      ) : null}
    </label>
  );
}

/** Text input styled to our tokens — warm field, carbon focus ring. */
export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm text-ink bg-warm border border-border rounded-md placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 transition-colors ${className}`}
      {...props}
    />
  );
}
