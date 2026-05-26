/** Format a `YYYY-MM-DD` date string as e.g. "Jul 29, 1988".
 *
 *  `new Date("1988-07-29")` parses as UTC midnight, so a plain
 *  `toLocaleDateString` renders the *previous* day in any negative-offset
 *  timezone (the Americas). Pinning the format to UTC keeps the shown day
 *  equal to the literal string. */
export function formatFileDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
