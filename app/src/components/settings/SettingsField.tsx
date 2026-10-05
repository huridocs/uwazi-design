import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { FieldMessage, issueBorderClass } from "../shared/FieldMessage";
import { Select } from "../shared/Select";
import type { ValidationIssue } from "../../utils/validation";

/** Labelled form field wrapper for settings forms.
 *
 *  Validation rides the shared `FieldMessage` idiom (same line the entity
 *  metadata edit form uses): pass `issue` from `utils/validation` and the
 *  message renders under the control — amber warning / seal error — while the
 *  child input is linked via `aria-describedby` (+ `aria-invalid` on errors).
 *  The legacy string `error` prop still works and maps to an error issue.
 *
 *  The label is a real `<label htmlFor>`: the single control child receives the
 *  id (its own `id` wins), so the hint and message stay OUT of its accessible
 *  name and are linked by `aria-describedby` instead. A field whose content is a
 *  set of controls rather than one (a swatch palette, a checklist) passes
 *  `group`, and renders as a `fieldset` whose `legend` is the label. */
export function SettingsField({
  label,
  hint,
  description,
  error,
  issue,
  group = false,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  /** Help that stays visible under the control whatever the message line
   *  shows (Uwazi's tooltip copy, as text). Linked by `aria-describedby`. */
  description?: ReactNode;
  error?: string;
  issue?: ValidationIssue | null;
  /** The children are several controls answering one question. */
  group?: boolean;
  /** The control's id, when the control sits inside a wrapper (an icon, a clear
   *  button) rather than being the field's only child. */
  htmlFor?: string;
  children: ReactNode;
}) {
  const msgId = useId();
  const descId = useId();
  const generatedId = useId();
  const effective: ValidationIssue | null =
    issue ?? (error ? { severity: "error", message: error } : null);
  const describedBy =
    [effective || hint ? msgId : "", description ? descId : ""].filter(Boolean).join(" ") || undefined;
  const described = !!describedBy;

  const labelClass = `text-xs font-medium ${effective?.severity === "error" ? "text-seal-label" : "text-ink-secondary"}`;
  const descriptionNode = description ? (
    <div id={descId} data-part="description" className="text-xs text-ink-tertiary text-pretty flex flex-col gap-1.5">
      {description}
    </div>
  ) : null;

  if (group) {
    return (
      <fieldset
        data-component="SettingsField"
        data-kind="group"
        aria-describedby={describedBy}
        className="flex flex-col gap-1.5 min-w-0"
      >
        {label && <legend className={`${labelClass} mb-1.5`}>{label}</legend>}
        {children}
        <FieldMessage id={msgId} issue={effective} hint={hint} />
        {descriptionNode}
      </fieldset>
    );
  }

  // Link a single labelable control to its label and message. Anything else — a
  // wrapper, a readout, several nodes — renders untouched, and the label is
  // text unless the caller names the control with `htmlFor`.
  const single = isValidElement(children) && isLabelable(children.type)
    ? (children as ReactElement<Record<string, unknown>>)
    : null;
  const controlId = htmlFor ?? (single?.props.id as string | undefined) ?? generatedId;
  const child = single
    ? cloneElement(single, {
        id: controlId,
        "aria-describedby": described ? describedBy : undefined,
        "aria-invalid": effective?.severity === "error" || undefined,
      })
    : children;

  return (
    <div data-component="SettingsField" className="flex flex-col gap-1.5">
      {label &&
        (single || htmlFor ? (
          <label htmlFor={controlId} data-part="label" className={labelClass}>
            {label}
          </label>
        ) : (
          <span data-part="label" className={labelClass}>
            {label}
          </span>
        ))}
      {child}
      <FieldMessage id={msgId} issue={effective} hint={hint} />
      {descriptionNode}
    </div>
  );
}

/** The children a `<label htmlFor>` can point at: native form controls and the
 *  two components here that put their id on one. */
function isLabelable(type: unknown): boolean {
  return (
    type === "input" ||
    type === "select" ||
    type === "textarea" ||
    type === "button" ||
    type === TextInput ||
    type === Select
  );
}

/** Text input styled to our tokens — warm field, carbon focus ring. Pass the
 *  field's `issue` to tint the border to match its message (seal / amber). */
export function TextInput({
  className = "",
  issue,
  addon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  issue?: ValidationIssue | null;
  /** Fixed text joined to the input's start ("https://yourdomain"). Not part
   *  of the value. */
  addon?: string;
}) {
  if (addon)
    return (
      <div data-component="TextInput" data-part="with-addon" className="flex min-w-0" dir="ltr">
        <span
          data-part="addon"
          aria-hidden
          className={`shrink-0 flex items-center px-3 text-sm text-ink-tertiary bg-vellum border border-e-0 ${issueBorderClass(issue)} rounded-s-md`}
        >
          {addon}
        </span>
        <input
          className={`w-full min-w-0 px-3 py-2 text-sm text-ink bg-warm border ${issueBorderClass(issue)} rounded-e-md placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 transition-colors ${className}`}
          {...props}
        />
      </div>
    );
  return (
    <input
      data-component="TextInput"
      className={`w-full px-3 py-2 text-sm text-ink bg-warm border ${issueBorderClass(issue)} rounded-md placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 transition-colors ${className}`}
      {...props}
    />
  );
}
