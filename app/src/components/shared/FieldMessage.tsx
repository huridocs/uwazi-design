import { AlertTriangle, CircleAlert } from "lucide-react";
import type { ValidationIssue } from "../../utils/validation";

/** The ONE per-field validation line — a quiet 11px message under an input,
 *  amber for a warning (saving still allowed), seal for an error (blocks save).
 *  Both the entity metadata edit form and the settings forms render through
 *  this, so the two surfaces share a single visual language.
 *
 *  `reserve` keeps the line MOUNTED at its height with only the content
 *  toggling (PATTERNS: never shift layout on state change) — a message landing
 *  on blur must not shove the fields below it. Hosts that already reserve
 *  space in their own flow (settings `Field`, which swaps hint ↔ message on
 *  one line) leave it off.
 *
 *  No `role="alert"` here on purpose: per-field messages arrive on blur and
 *  would be noisy announced live. The save-attempt SUMMARY is the alert;
 *  inputs point at this line via `aria-describedby` + `aria-invalid`. */
export function FieldMessage({
  issue,
  hint,
  id,
  reserve = false,
}: {
  issue?: ValidationIssue | null;
  /** Neutral helper text shown when there is no issue. */
  hint?: string;
  /** Target for the input's `aria-describedby`. */
  id?: string;
  /** Keep the line mounted (min-h) even while empty. */
  reserve?: boolean;
}) {
  if (!issue && !hint && !reserve) return null;
  const tone = !issue
    ? "text-ink-tertiary"
    : issue.severity === "error"
      ? "text-seal-label"
      : "text-warning";
  return (
    <div
      id={id}
      className={`flex items-center gap-1 text-[11px] leading-4 ${reserve ? "min-h-4" : ""} ${tone}`}
    >
      {issue &&
        (issue.severity === "error" ? (
          <CircleAlert size={11} className="shrink-0" aria-hidden />
        ) : (
          <AlertTriangle size={11} className="shrink-0" aria-hidden />
        ))}
      <span className="min-w-0">{issue ? issue.message : (hint ?? "")}</span>
    </div>
  );
}

/** Border tint matching the message severity — callers swap it in for
 *  `border-border` on the offending input so field and message agree. */
export function issueBorderClass(issue?: ValidationIssue | null): string {
  if (!issue) return "border-border";
  return issue.severity === "error" ? "border-seal" : "border-warning";
}
