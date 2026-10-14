import type { Reference } from "../data/references";
import { isNepalEntity, nepalReferencesFor } from "../data/nepal/profile";
import { isVegasEntity, vegasReferencesFor } from "../data/vegas/profile";

/** The references behind a Results snippet: the `refId`s a quote or an
 *  annotation field carries (`MetadataSnippet.refId`), resolved on the record
 *  the snippet was found on, so each reads from that record's side (the same
 *  objects the Relationships panel shows, with their sources, status and
 *  contest). Only Nepal and Las Vegas carry them; elsewhere this is empty. */
export function snippetReferences(entityId: string, refIds: readonly string[]): Reference[] {
  if (!refIds.length) return [];
  const prefix = isNepalEntity(entityId) ? "np-" : isVegasEntity(entityId) ? "vg-" : null;
  if (!prefix) return [];
  const all = prefix === "np-" ? nepalReferencesFor(entityId) : vegasReferencesFor(entityId);
  const want = new Set(refIds.map((id) => prefix + id));
  return all.filter((r) => want.has(r.id));
}
