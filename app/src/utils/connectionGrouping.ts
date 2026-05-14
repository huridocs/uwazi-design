import { getEntity, getEntityType } from "../data/entities";
import { Reference, relationTypes } from "../data/references";
import { Relationship } from "./relationships";
import { GroupBy } from "../atoms/filters";

export interface GroupingDescriptor {
  id: GroupBy;
  label: string;
}

/** Dimensions you can group connections by. Ordered for the dropdown. */
export const groupingOptions: GroupingDescriptor[] = [
  { id: "none", label: "None" },
  { id: "target-template", label: "Target template" },
  { id: "target-entity", label: "Target entity" },
  { id: "relation-type", label: "Relation type" },
  { id: "direction", label: "Direction" },
  { id: "source-page", label: "Source page" },
];

/** Stable key used to bucket a Reference for a given grouping. */
export function getGroupKey(ref: Reference, by: GroupBy): string {
  switch (by) {
    case "target-template": {
      const entity = getEntity(ref.targetEntityId);
      return entity?.typeId ?? "unknown";
    }
    case "target-entity":
      return ref.targetEntityId;
    case "relation-type":
      return ref.relationType;
    case "direction":
      return ref.direction ?? "outgoing";
    case "source-page": {
      const page = ref.sourceSelection?.page;
      return page === undefined ? "no-page" : String(page);
    }
    case "none":
    default:
      return "";
  }
}

/** Human-readable group title. */
export function getGroupLabel(key: string, by: GroupBy): string {
  switch (by) {
    case "target-template":
      return getEntityType(key)?.name ?? "Unknown template";
    case "target-entity":
      return getEntity(key)?.title ?? "Unknown entity";
    case "relation-type":
      return relationTypes.find((r) => r.id === key)?.label ?? key;
    case "direction":
      return key === "incoming" ? "Incoming" : "Outgoing";
    case "source-page":
      return key === "no-page" ? "No page" : `Page ${key}`;
    case "none":
    default:
      return key;
  }
}

/** Optional accent colour for the group header pill. */
export function getGroupColor(key: string, by: GroupBy): string | undefined {
  switch (by) {
    case "target-template":
      return getEntityType(key)?.color;
    case "target-entity": {
      const entity = getEntity(key);
      return entity ? getEntityType(entity.typeId)?.color : undefined;
    }
    default:
      return undefined;
  }
}

/** Returns true if a key represents an "unknown / no label" bucket for the
 *  given grouping. Such buckets are pinned to the bottom of any group list. */
export function isUnknownGroupKey(key: string, by: GroupBy): boolean {
  switch (by) {
    case "target-template":
      return key === "unknown";
    case "target-entity":
      return !getEntity(key);
    case "relation-type":
      return key === "no_label";
    case "source-page":
      return key === "no-page";
    default:
      return false;
  }
}

/** Bucket refs by the selected dimension. Keys appear in the order their first
 *  member shows up in the input array, except "unknown / no label" buckets
 *  which are pinned to the bottom. */
export function groupRefs(
  refs: Reference[],
  by: GroupBy,
): [string, Reference[]][] {
  if (by === "none") return [["", refs]];
  const map = new Map<string, Reference[]>();
  for (const ref of refs) {
    const key = getGroupKey(ref, by);
    const list = map.get(key) ?? [];
    list.push(ref);
    map.set(key, list);
  }
  const entries = Array.from(map.entries());
  return entries.sort(([a], [b]) => {
    const aUnknown = isUnknownGroupKey(a, by) ? 1 : 0;
    const bUnknown = isUnknownGroupKey(b, by) ? 1 : 0;
    return aUnknown - bUnknown;
  });
}

/** Same as {@link getGroupKey} but for an aggregated Relationship. Used by
 *  the graph (whose nodes are relationships) so it can spoke by any axis. */
export function getRelGroupKey(rel: Relationship, by: GroupBy): string {
  switch (by) {
    case "target-template": {
      const entity = getEntity(rel.targetEntityId);
      return entity?.typeId ?? "unknown";
    }
    case "target-entity":
      return rel.targetEntityId;
    case "relation-type":
      return rel.relationType;
    case "direction":
      return rel.direction;
    case "source-page":
      return rel.firstPage === undefined ? "no-page" : String(rel.firstPage);
    case "none":
    default:
      return "";
  }
}
