/** The collection's date format (Settings › Collection › "Default date
 *  format"), Uwazi's `settings.dateFormat`: one of six patterns. Metadata
 *  values, date inputs and the Library's date filters print through
 *  `formatDateDisplay`, which reads the active pattern.
 *
 *  The pattern is held here as module state, set by `App` from the
 *  Collection store on every render, because some formatters run outside
 *  React (record projection). Stored date values are never rewritten: only
 *  their display follows the setting. */
import { parseDateValue } from "./dateValue";

export type DatePattern = "yyyy/MM/dd" | "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd" | "dd-MM-yyyy" | "MM-dd-yyyy";

/** Uwazi's options, in its order. */
export const DATE_PATTERNS: DatePattern[] = [
  "yyyy/MM/dd",
  "dd/MM/yyyy",
  "MM/dd/yyyy",
  "yyyy-MM-dd",
  "dd-MM-yyyy",
  "MM-dd-yyyy",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** A date in a pattern. `utc` reads the UTC fields (stored values parse to
 *  UTC midnight); a local date (today) passes false. */
export function formatWithPattern(d: Date, pattern: DatePattern, utc = true): string {
  const y = String(utc ? d.getUTCFullYear() : d.getFullYear());
  const m = pad((utc ? d.getUTCMonth() : d.getMonth()) + 1);
  const day = pad(utc ? d.getUTCDate() : d.getDate());
  return pattern.replace("yyyy", y).replace("MM", m).replace("dd", day);
}

/** How precisely a date is known. */
export type DatePrecision = "day" | "month" | "year";

/** A date printed only as precisely as it is known: the collection's pattern
 *  for a day, the same pattern without its day for a month ("2024/03"), the
 *  year alone for a year. Reads UTC, like `formatWithPattern`. */
export function formatAtPrecision(d: Date, precision: DatePrecision, pattern: DatePattern = active): string {
  if (precision === "year") return String(d.getUTCFullYear());
  if (precision === "day") return formatWithPattern(d, pattern);
  const sep = pattern.includes("/") ? "/" : "-";
  const monthPattern = pattern
    .split(sep)
    .filter((part) => part !== "dd")
    .join(sep) as DatePattern;
  return formatWithPattern(d, monthPattern);
}

/** "2026/10/04 (Year/Month/Day)": the option label, built from today. */
export function datePatternLabel(pattern: DatePattern, today = new Date()): string {
  const words = pattern.replace("yyyy", "Year").replace("MM", "Month").replace("dd", "Day");
  return `${formatWithPattern(today, pattern, false)} (${words})`;
}

let active: DatePattern = "yyyy/MM/dd";
export const setActiveDatePattern = (p: DatePattern) => {
  active = p;
};
export const activeDatePattern = () => active;

/** Values that name a whole day. A year alone ("2021") or a span stays as
 *  written. */
const FULL_DATE =
  /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+(?:de\s+)?\p{L}+\s+(?:de\s+)?\d{4}|\p{L}+\s+\d{1,2},\s*\d{4})$/u;

/** A stored date value as the collection prints dates. Anything that is not
 *  a whole day is returned unchanged. */
export function formatDateDisplay(raw: string | null | undefined, pattern: DatePattern = active): string {
  const value = (raw ?? "").trim();
  if (!FULL_DATE.test(value)) return raw ?? "";
  const d = parseDateValue(value);
  return d ? formatWithPattern(d, pattern) : value;
}

/** A date or a date range ("a – b") as the collection prints dates. */
export function formatDateText(raw: string | null | undefined, pattern: DatePattern = active): string {
  const value = raw ?? "";
  return value.includes(" – ")
    ? value
        .split(" – ")
        .map((p) => formatDateDisplay(p, pattern))
        .join(" – ")
    : formatDateDisplay(value, pattern);
}

/** Text typed in the active pattern → `yyyy-mm-dd`, or "" when it is not a
 *  date in that pattern. */
export function parsePatternInput(text: string, pattern: DatePattern = active): string {
  const sep = pattern.includes("/") ? "/" : "-";
  const order = pattern.split(sep);
  const parts = text.trim().split(sep);
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return "";
  const at = (k: string) => Number(parts[order.indexOf(k)]);
  const y = at("yyyy");
  const m = at("MM");
  const d = at("dd");
  if (String(y).length !== 4) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return "";
  return `${y}-${pad(m)}-${pad(d)}`;
}
