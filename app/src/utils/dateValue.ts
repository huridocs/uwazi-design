/** Date values in this prototype are STRINGS in whatever shape their source
 *  wrote them, and there are three shapes in the seed data:
 *
 *    - `dd/mm/yyyy`  — the whole CEJIL corpus (`fmtDate` in data/cejil/profile.ts)
 *    - `yyyy-mm-dd`  — what a native date input produces
 *    - prose         — the curated entity ("September 12, 1981",
 *                      "12 de septiembre de 1981", and the FR/AR equivalents)
 *
 *  `Date.parse` gets the first one WRONG in two different ways: `13/05/2021`
 *  is NaN (there is no month 13), and `05/06/2021` silently parses as June 5th
 *  because bare slash dates are read US-style. So both the edit input and the
 *  validator go through `parseDateValue` instead — one parser, day-first for
 *  slashes, so a date cannot mean one thing in the form and another in the
 *  message underneath it. */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const SLASHED = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
/** "12 de septiembre de 1981" / "12 septembre 1981" / "12 سبتمبر 1981" — day,
 *  month name, year, with the Spanish "de"s optional. */
const DAY_MONTH_YEAR = /^(\d{1,2})\s+(?:de\s+)?(\p{L}+)\s+(?:de\s+)?(\d{4})$/u;

/** Month names for the languages the curated entity is authored in. English
 *  isn't here because `Date.parse` already reads it; ES/FR/AR it does not, and
 *  those three rows are the whole reason this table exists. */
const MONTHS: Record<string, number> = {};
[
  "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre",
  "janvier février mars avril mai juin juillet août septembre octobre novembre décembre",
  "يناير فبراير مارس أبريل مايو يونيو يوليو أغسطس سبتمبر أكتوبر نوفمبر ديسمبر",
].forEach((row) => row.split(" ").forEach((name, i) => (MONTHS[name] = i + 1)));

const pad = (n: number) => String(n).padStart(2, "0");

/** Parse a stored date string to a UTC Date, or null if it isn't one.
 *  Slash dates are DAY-first (the CEJIL convention), never month-first. */
export function parseDateValue(raw: string | null | undefined): Date | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const iso = ISO.exec(value);
  if (iso) return utc(+iso[1], +iso[2], +iso[3]);

  const slashed = SLASHED.exec(value);
  if (slashed) return utc(+slashed[3], +slashed[2], +slashed[1]);

  // Prose, day-first with a month NAME — the curated entity's ES / FR / AR
  // rows. Date.parse knows none of these, so they blanked the input in exactly
  // the same way the slash dates did.
  const named = DAY_MONTH_YEAR.exec(value);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    if (month) return utc(+named[3], month, +named[1]);
  }

  // English prose ("September 12, 1981") — Date.parse handles it.
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

/** Build a UTC date and reject overflow (`31/02/2021` must not roll into March). */
function utc(year: number, month: number, day: number): Date | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
    ? d
    : null;
}

/** Stored value → what `<input type="date">` will actually accept.
 *  A native date input takes `yyyy-mm-dd` and NOTHING else: hand it anything
 *  else and the browser silently blanks the control, which is how a seeded date
 *  turned into an empty required field and then into a save that dropped it. */
export function toDateInputValue(raw: string | null | undefined): string {
  const d = parseDateValue(raw);
  if (!d) return "";
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** What the input gives back (`yyyy-mm-dd`) → the shape the field was stored in.
 *  A `dd/mm/yyyy` field stays `dd/mm/yyyy` so editing one date on a CEJIL entity
 *  doesn't leave that row in a different notation from every other row. Prose
 *  can't be regenerated, so it becomes ISO — unambiguous, and the value the user
 *  actually picked. */
export function fromDateInputValue(iso: string, previous: string | null | undefined): string {
  if (!iso) return "";
  const parts = ISO.exec(iso);
  if (!parts) return iso;
  return SLASHED.test((previous ?? "").trim())
    ? `${parts[3]}/${parts[2]}/${parts[1]}`
    : iso;
}
