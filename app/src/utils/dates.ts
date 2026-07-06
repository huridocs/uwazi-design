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

/** Same UTC pinning, `MM/DD/YYYY` shape (the Import CSV tables). */
export function formatSlashDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getUTCFullYear()}`;
}

/** Same UTC pinning, `MMM D` shape (issue/entity row dates). */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
