import { Direction, Reference, RelationType } from "../data/references";

export interface Relationship {
  id: string;
  targetEntityId: string;
  relationType: RelationType;
  direction: Direction;
  evidenceCount: number;
  /** Smallest page number across underlying refs that have a source text
   *  anchor. Undefined when every backing ref is entity-level (no
   *  sourceSelection). */
  firstPage?: number;
  refIds: string[];
}

/** Dedupe references by (targetEntityId, relationType, direction) to produce a
 *  relationship view. Each direction becomes its own relationship so the
 *  arrow indicator is unambiguous. */
export function deriveRelationships(refs: Reference[]): Relationship[] {
  const map = new Map<string, Relationship>();
  for (const ref of refs) {
    const direction: Direction = ref.direction ?? "outgoing";
    const key = `${ref.targetEntityId}::${ref.relationType}::${direction}`;
    const page = ref.sourceSelection?.page;
    const existing = map.get(key);
    if (existing) {
      existing.evidenceCount += 1;
      existing.refIds.push(ref.id);
      if (
        page !== undefined &&
        (existing.firstPage === undefined || page < existing.firstPage)
      ) {
        existing.firstPage = page;
      }
    } else {
      map.set(key, {
        id: key,
        targetEntityId: ref.targetEntityId,
        relationType: ref.relationType,
        direction,
        evidenceCount: 1,
        firstPage: page,
        refIds: [ref.id],
      });
    }
  }
  return Array.from(map.values());
}
