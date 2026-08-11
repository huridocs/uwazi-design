/**
 * Form validation — ONE rule engine for the entity metadata edit form and the
 * settings forms, so both surfaces speak the same language.
 *
 * A rule produces a `ValidationIssue` with a severity:
 *   - `error`   → BLOCKS save. Required value missing, non-numeric text in a
 *                 numeric field, an unparseable date, a malformed link.
 *   - `warning` → allows save but surfaces. Suspiciously short required text,
 *                 a date more than a year in the future, an insecure http link.
 *
 * Severity maps onto the app's semantic colours exactly as everywhere else:
 * seal = error/danger, amber = warning. Rendering goes through the shared
 * `FieldMessage` line (components/shared/FieldMessage.tsx).
 */

import { parseDateValue } from "./dateValue";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
}

/** What shape of value a field holds — drives which rules apply. */
export type ValueKind = "text" | "multiline" | "date" | "link" | "numeric";

export interface ValidateOptions {
  /** Empty value → error instead of passing. */
  required?: boolean;
  /** Human label used in messages ("Title is required."). */
  label?: string;
}

/** Non-empty required text shorter than this draws a warning, not an error —
 *  "AB" is probably a slip, but it might be a real acronym, so it saves. */
const SHORT_TEXT_MIN = 3;

/** Dates further out than this from now are suspicious (warning). */
const FAR_FUTURE_MS = 365 * 24 * 60 * 60 * 1000;

const error = (message: string): ValidationIssue => ({ severity: "error", message });
const warning = (message: string): ValidationIssue => ({ severity: "warning", message });

/** Validate one scalar value. Returns the single most pressing issue, or null.
 *  Relationship / derived fields are exempt by construction: they never reach
 *  this (callers already filter `type !== "relationship"` / `readOnly`). */
export function validateValue(
  kind: ValueKind,
  raw: string | null | undefined,
  opts: ValidateOptions = {},
): ValidationIssue | null {
  const value = (raw ?? "").trim();
  const label = opts.label ?? "This field";

  if (!value) {
    return opts.required ? error(`${label} is required.`) : null;
  }

  switch (kind) {
    case "numeric": {
      if (Number.isNaN(Number(value))) return error(`${label} must be a number.`);
      return null;
    }
    case "date": {
      // `parseDateValue`, not `Date.parse` — stored dates are `dd/mm/yyyy` in
      // the CEJIL corpus, which Date.parse reads month-first: "13/05/2021" came
      // back NaN and flagged a perfectly good date as invalid, while
      // "05/06/2021" quietly passed as June 5th.
      const d = parseDateValue(value);
      if (!d) return error(`${label} is not a valid date.`);
      if (d.getTime() > Date.now() + FAR_FUTURE_MS)
        return warning(`${label} is more than a year in the future.`);
      return null;
    }
    case "link": {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        return error(`${label} is not a valid link — include https://.`);
      }
      if (url.protocol !== "http:" && url.protocol !== "https:")
        return error(`${label} must be an http(s) link.`);
      if (url.protocol === "http:")
        return warning(`${label} uses http — prefer a secure https link.`);
      return null;
    }
    default: {
      // text / multiline: length sanity only ever WARNS, and only on fields
      // that matter enough to be required.
      if (opts.required && value.length < SHORT_TEXT_MIN)
        return warning(`${label} looks suspiciously short.`);
      return null;
    }
  }
}

/** Tally a set of per-field results (nulls welcome). */
export function countBySeverity(
  issues: Iterable<ValidationIssue | null | undefined>,
): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const issue of issues) {
    if (!issue) continue;
    if (issue.severity === "error") errors += 1;
    else warnings += 1;
  }
  return { errors, warnings };
}

/** The save-attempt summary line: "2 errors block saving · 1 warning". */
export function blockingSummary(errors: number, warnings: number): string {
  const head = errors === 1 ? "1 error blocks saving" : `${errors} errors block saving`;
  if (warnings === 0) return head;
  return `${head} · ${warnings} warning${warnings === 1 ? "" : "s"}`;
}
