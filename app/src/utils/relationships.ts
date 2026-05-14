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
 *  arrow indicator is unambiguous. By default refs that belong to a hub
 *  (hubId set) are skipped — see {@link deriveHubs}. Pass
 *  `{ includeHubMembers: true }` when the consumer renders one node per
 *  member (e.g. the graph view, which doesn't have a "hub container" node). */
export function deriveRelationships(
  refs: Reference[],
  opts: { includeHubMembers?: boolean } = {},
): Relationship[] {
  const map = new Map<string, Relationship>();
  for (const ref of refs) {
    if (ref.hubId && !opts.includeHubMembers) continue;
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

export interface Hub {
  id: string;
  relationType: RelationType;
  /** Each member is one entity in the n-ary relationship, with the refs that
   *  back that membership. */
  members: { entityId: string; refIds: string[] }[];
  /** Smallest page number across underlying refs that have a source text
   *  anchor. Undefined when every backing ref is entity-level. */
  firstPage?: number;
  refIds: string[];
}

/** Collapse refs sharing a `hubId` into Hub records. Uwazi calls these n-ary
 *  relationships — a single container with 2+ entity members. The relType is
 *  taken from the first ref of the group; in real Uwazi each member can have
 *  its own role, but the prototype uses a single shared label. */
export function deriveHubs(refs: Reference[]): Hub[] {
  const map = new Map<string, Hub>();
  for (const ref of refs) {
    if (!ref.hubId) continue;
    const page = ref.sourceSelection?.page;
    const existing = map.get(ref.hubId);
    if (existing) {
      existing.refIds.push(ref.id);
      const member = existing.members.find((m) => m.entityId === ref.targetEntityId);
      if (member) {
        member.refIds.push(ref.id);
      } else {
        existing.members.push({ entityId: ref.targetEntityId, refIds: [ref.id] });
      }
      if (
        page !== undefined &&
        (existing.firstPage === undefined || page < existing.firstPage)
      ) {
        existing.firstPage = page;
      }
    } else {
      map.set(ref.hubId, {
        id: ref.hubId,
        relationType: ref.relationType,
        members: [{ entityId: ref.targetEntityId, refIds: [ref.id] }],
        firstPage: page,
        refIds: [ref.id],
      });
    }
  }
  return Array.from(map.values());
}
