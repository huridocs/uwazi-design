import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { FieldMessage, issueBorderClass } from "../shared/FieldMessage";
import type { ValidationIssue } from "../../utils/validation";

/** Labelled form field wrapper for settings forms.
 *
 *  Validation rides the shared `FieldMessage` idiom (same line the entity
 *  metadata edit form uses): pass `issue` from `utils/validation` and the
 *  message renders under the control — amber warning / seal error — while the
 *  child input is linked via `aria-describedby` (+ `aria-invalid` on errors).
 *  The legacy string `error` prop still works and maps to an error issue. */
export function Field({
  label,
  hint,
  error,
  issue,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  issue?: ValidationIssue | null;
  children: ReactNode;
}) {
  const msgId = useId();
  const effective: ValidationIssue | null =
    issue ?? (error ? { severity: "error", message: error } : null);

  // Link the (single-element) control to its message for screen readers. A
  // fragment/multi-node child just renders untouched.
  const child =
    effective && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          "aria-describedby": msgId,
          "aria-invalid": effective.severity === "error" || undefined,
        })
      : children;

  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-medium text-ink-secondary">{label}</span>}
      {child}
      <FieldMessage id={msgId} issue={effective} hint={hint} />
    </label>
  );
}

/** Text input styled to our tokens — warm field, carbon focus ring. Pass the
 *  field's `issue` to tint the border to match its message (seal / amber). */
export function TextInput({
  className = "",
  issue,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { issue?: ValidationIssue | null }) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm text-ink bg-warm border ${issueBorderClass(issue)} rounded-md placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 transition-colors ${className}`}
      {...props}
    />
  );
}
