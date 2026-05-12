import { getEntity, getEntityType } from "../data/entities";
import { Reference, relationTypes } from "../data/references";
import { GroupBy } from "../atoms/filters";

export interface GroupingDescriptor {
  id: GroupBy;
  label: string;
}

/** Dimensions you can group connections by. Ordered for the dropdown. */
export const groupingOptions: GroupingDescriptor[] = [
  { id: "none", label: "None" },
  { id: "target-template", label: "Target template" },
  { id: "target-entity", label: "Target document" },
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
    case "source-page":
      return String(ref.sourceSelection.page);
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
      return `Page ${key}`;
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

/** Bucket refs by the selected dimension. Order is stable: keys appear in the
 *  order their first member shows up in the input array. */
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
  return Array.from(map.entries());
}
