import { Direction, Reference, RelationType } from "../data/references";

export interface Relationship {
  id: string;
  targetEntityId: string;
  relationType: RelationType;
  /** First direction encountered while aggregating — the "primary" direction.
   *  When `directions.length === 2` the relationship is bidirectional and
   *  this field is not meaningful on its own. Kept for backwards compat with
   *  callers that need a single direction (e.g. graph node keying). */
  direction: Direction;
  /** Every direction that appears among the backing refs. Length 1 for the
   *  common case; length 2 when the same `(target, relationType)` pair has
   *  both incoming and outgoing edges — those collapse into one aggregate
   *  row with a bidirectional glyph. */
  directions: Direction[];
  evidenceCount: number;
  /** Smallest page number across underlying refs that have a source text
   *  anchor. Undefined when every backing ref is entity-level (no
   *  sourceSelection). */
  firstPage?: number;
  refIds: string[];
}

/** Dedupe references by (targetEntityId, relationType) to produce a
 *  relationship view. Incoming and outgoing edges with the same target +
 *  type collapse into a single bidirectional aggregate; the row surfaces
 *  the merged set via `directions[]`. By default refs that belong to a hub
 *  (hubId set) are skipped — see {@link deriveHubs}. Pass
 *  `{ includeHubMembers: true }` when the consumer renders one node per
 *  member (e.g. the graph view, which doesn't have a "hub container" node). */
function computeRelationships(
  refs: Reference[],
  opts: { includeHubMembers?: boolean } = {},
): Relationship[] {
  const map = new Map<string, Relationship>();
  for (const ref of refs) {
    if (ref.hubId && !opts.includeHubMembers) continue;
    const direction: Direction = ref.direction ?? "outgoing";
    const key = `${ref.targetEntityId}::${ref.relationType}`;
    const page = ref.sourceSelection?.page;
    const existing = map.get(key);
    if (existing) {
      existing.evidenceCount += 1;
      existing.refIds.push(ref.id);
      if (!existing.directions.includes(direction)) {
        existing.directions.push(direction);
      }
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
        directions: [direction],
        evidenceCount: 1,
        firstPage: page,
        refIds: [ref.id],
      });
    }
  }
  return Array.from(map.values());
}


/* ── Derivation cache ─────────────────────────────────────────────────────────
   Both derivations are pure functions of the ref array, and the tree asks for
   the same bucket more than once in a single render: `count` on the branch
   header, then again inside `renderAggregates` for the rows — per group AND per
   sub-group, so a two-level grouping walks the corpus four times over to draw
   what it already knew.

   The cache is keyed on the ARRAY IDENTITY, which is the honest key for a pure
   function of that array and asks nothing of callers except that they not mutate
   a bucket they have already handed in (nobody does — `groupRefs` builds fresh
   arrays and the views only read them). A `WeakMap` means a bucket's entry dies
   with the bucket: no eviction policy, no staleness, nothing to remember to
   clear when the corpus changes. Callers that memoise their buckets across
   renders (see `RelationshipsTreeView`) get the saving across renders too;
   callers that don't still pay for one derivation per bucket per render instead
   of two or four. */
const relCache = new WeakMap<Reference[], Map<boolean, Relationship[]>>();
const hubCache = new WeakMap<Reference[], Hub[]>();

/** Cached {@link computeRelationships} — see the derivation-cache note above. */
export function deriveRelationships(
  refs: Reference[],
  opts: { includeHubMembers?: boolean } = {},
): Relationship[] {
  const includeHubMembers = !!opts.includeHubMembers;
  let byOpt = relCache.get(refs);
  if (!byOpt) {
    byOpt = new Map();
    relCache.set(refs, byOpt);
  }
  const hit = byOpt.get(includeHubMembers);
  if (hit) return hit;
  const value = computeRelationships(refs, opts);
  byOpt.set(includeHubMembers, value);
  return value;
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
function computeHubs(refs: Reference[]): Hub[] {
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

/** Cached {@link computeHubs} — see the derivation-cache note above. */
export function deriveHubs(refs: Reference[]): Hub[] {
  const hit = hubCache.get(refs);
  if (hit) return hit;
  const value = computeHubs(refs);
  hubCache.set(refs, value);
  return value;
}
