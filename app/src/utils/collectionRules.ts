/** Settings › Collection's field checks (page-briefs.md "Collection"). Uwazi
 *  checks only the name and the map key; the landing page, the two email
 *  addresses, the Matomo JSON and the starting point are checked here too,
 *  as the acceptance list asks. Each returns the message shown under its
 *  field, or null. An empty optional field passes. */

/** Uwazi's runtime test for a landing page (`routeHelpers.ts`): a relative
 *  library, page or entity URL. Empty means the library. */
const LANDING = /^(\/[a-z]{2})?\/(library(\/map)?(\/table)?\/?(\?.*)?|page\/.+|entity\/.+)$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Uwazi's pattern for the map key. */
const MAP_KEY = /^[a-zA-Z0-9._]*$/;

export const nameIssue = (v: string): string | null => (v.trim() ? null : "Enter a name for the collection.");

export const landingIssue = (v: string): string | null =>
  !v.trim() || LANDING.test(v.trim())
    ? null
    : "Use a relative URL that starts with /page/, /entity/ or /library/, for example /page/dicxg0oagy3xgr7ixef80k9.";

export const emailIssue = (v: string): string | null =>
  !v.trim() || EMAIL.test(v.trim()) ? null : "Enter a valid email address, such as name@example.org.";

export const mapKeyIssue = (v: string): string | null =>
  MAP_KEY.test(v.trim()) ? null : "Use only letters, digits, dots and underscores.";

/** Uwazi `matomoConfig`: a JSON object with a string `id` and `url`. */
export function matomoIssue(v: string): string | null {
  if (!v.trim()) return null;
  try {
    const o = JSON.parse(v.trim());
    if (o && typeof o === "object" && typeof o.id === "string" && typeof o.url === "string") return null;
  } catch {
    // Falls through to the message.
  }
  return 'Use the form {"id":"1","url":"https://…"}.';
}

/** The starting point is both numbers or neither. The message goes under the
 *  empty one. */
export function pointIssues(lat: string, lon: string): { lat?: string; lon?: string } {
  const hasLat = lat.trim() !== "";
  const hasLon = lon.trim() !== "";
  if (hasLat === hasLon) return {};
  return hasLat ? { lon: "Enter a longitude, or clear both." } : { lat: "Enter a latitude, or clear both." };
}
