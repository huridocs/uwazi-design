import { Reference, RelationType } from "../data/references";

export interface Relationship {
  id: string;
  targetEntityId: string;
  relationType: RelationType;
  evidenceCount: number;
  firstPage: number;
  refIds: string[];
}

/** Dedupe references by (targetEntityId, relationType) to produce a relationship view. */
export function deriveRelationships(refs: Reference[]): Relationship[] {
  const map = new Map<string, Relationship>();
  for (const ref of refs) {
    const key = `${ref.targetEntityId}::${ref.relationType}`;
    const existing = map.get(key);
    if (existing) {
      existing.evidenceCount += 1;
      existing.refIds.push(ref.id);
      if (ref.sourceSelection.page < existing.firstPage) {
        existing.firstPage = ref.sourceSelection.page;
      }
    } else {
      map.set(key, {
        id: key,
        targetEntityId: ref.targetEntityId,
        relationType: ref.relationType,
        evidenceCount: 1,
        firstPage: ref.sourceSelection.page,
        refIds: [ref.id],
      });
    }
  }
  return Array.from(map.values());
}
