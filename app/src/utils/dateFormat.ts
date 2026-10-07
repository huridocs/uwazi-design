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

/** A day with a time of day after it ("08/09/2025 12:37", "2025-09-08T12:37"):
 *  what a record whose precision is Hour stores. */
const WITH_TIME = /^(.+?)[ T](\d{2}:\d{2}(?::\d{2})?)$/;

/** "12:37": hours and minutes, 24-hour, UTC like the stored values; and
 *  seconds when the instant has them ("22:06:06", the Vegas recordings). */
export function formatTime(ms: number): string {
  const d = new Date(ms);
  const ss = d.getUTCSeconds() ? `:${pad(d.getUTCSeconds())}` : "";
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}${ss}`;
}

/** An instant as the collection prints dates, with ", 12:37" when the time
 *  matters. Every surface that prints a moment (the brush, the date chip, a
 *  timed field) goes through this, so one collection has one date format. */
export function formatMoment(ms: number, withTime: boolean, pattern: DatePattern = active): string {
  const day = formatWithPattern(new Date(ms), pattern);
  return withTime ? `${day}, ${formatTime(ms)}` : day;
}

/** Two instants as one span: a single day prints once ("2025/09/08, 12:37–16:00"
 *  or "2025/09/08"), an open end reads "Since …" / "Until …". */
export function formatMomentSpan(from: number | null, to: number | null, withTime: boolean, pattern: DatePattern = active): string {
  if (from !== null && to !== null) {
    const a = formatWithPattern(new Date(from), pattern);
    const b = formatWithPattern(new Date(to), pattern);
    if (a === b) return withTime ? `${a}, ${formatTime(from)}–${formatTime(to)}` : a;
    return `${formatMoment(from, withTime, pattern)} – ${formatMoment(to, withTime, pattern)}`;
  }
  if (from !== null) return `Since ${formatMoment(from, withTime, pattern)}`;
  if (to !== null) return `Until ${formatMoment(to, withTime, pattern)}`;
  return "";
}

/** A stored date value as the collection prints dates, with its time of day
 *  when it has one. Anything that is not a whole day is returned unchanged. */
export function formatDateDisplay(raw: string | null | undefined, pattern: DatePattern = active): string {
  const value = (raw ?? "").trim();
  const timed = WITH_TIME.exec(value);
  const day = timed ? timed[1] : value;
  if (!FULL_DATE.test(day)) return raw ?? "";
  const d = parseDateValue(day);
  if (!d) return value;
  return timed ? `${formatWithPattern(d, pattern)}, ${timed[2]}` : formatWithPattern(d, pattern);
}

/** A date or a date range ("a – b") as the collection prints dates. A range
 *  inside one day prints the day once; an open range ("a –", "– b") reads
 *  "Since a" / "Until b" instead of ending on a dash. */
export function formatDateText(raw: string | null | undefined, pattern: DatePattern = active): string {
  const value = (raw ?? "").trim();
  const open = /^(.+?)\s+–$/.exec(value);
  if (open) return `Since ${formatDateDisplay(open[1], pattern)}`;
  const until = /^–\s+(.+)$/.exec(value);
  if (until) return `Until ${formatDateDisplay(until[1], pattern)}`;
  if (!value.includes(" – ")) return formatDateDisplay(raw, pattern);
  const [a, b] = value.split(" – ");
  const ta = WITH_TIME.exec(a);
  const tb = WITH_TIME.exec(b);
  const dayA = formatDateDisplay(ta ? ta[1] : a, pattern);
  const dayB = formatDateDisplay(tb ? tb[1] : b, pattern);
  if (dayA === dayB && FULL_DATE.test((ta ? ta[1] : a).trim())) {
    if (ta && tb) return ta[2] === tb[2] ? `${dayA}, ${ta[2]}` : `${dayA}, ${ta[2]}–${tb[2]}`;
    return ta ? `${dayA}, ${ta[2]}` : dayA;
  }
  return value
    .split(" – ")
    .map((p) => formatDateDisplay(p, pattern))
    .join(" – ");
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
