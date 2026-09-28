/* The entity the CEJIL collection opens on.
 *
 * Blake (Causa) — chosen by measurement, not by name (relationships redesign v4
 * §A.1): of the 337 Causas it has the richest "Jueces firmantes" chain (14 judges,
 * 13 with a País), a 2+ member own field, and "Listed in" / untyped / listed-together
 * connections one step away, on a record small enough (12 connected entities) to
 * read on one screen. Addressed by sharedId so a retitled record keeps its place. */
import { cejilEsBySid } from "./load";
import { cejilTemplates } from "./templates";

export const CEJIL_DEFAULT_SHARED_ID = "xruguwr41jicc8fr";

/** The default's sharedId when the loaded corpus has it; failing that the first
 *  Causa, so a corpus re-import that drops the record still lands on a case.
 *  null until the corpus is loaded. */
export function cejilDefaultEntityId(): string | null {
  const bySid = cejilEsBySid();
  if (bySid.size === 0) return null;
  if (bySid.has(CEJIL_DEFAULT_SHARED_ID)) return CEJIL_DEFAULT_SHARED_ID;
  const causa = cejilTemplates.find((t) => t.name.trim() === "Causa")?._id;
  for (const [sid, e] of bySid) if (e.template === causa) return sid;
  return null;
}
