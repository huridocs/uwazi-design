import { useMemo } from "react";
import { useGroupExpansion } from "../../hooks/useGroupExpansion";
import type { Reference } from "../../data/references";
import type { Hub } from "../../utils/relationships";
import { RelationshipRow } from "./RelationshipRow";
import { TreeNode } from "./TreeBranch";
import { HubMemberCard } from "./rows/HubMemberCard";
import type { MemberCardHide } from "./rows/MemberCard";

/** A hub and, when open, one card per member. Every hub opens, anchored or
 *  not. In the Tree the cards hang on connectors; in the List they sit in a
 *  plain indented stack under the row. */
export function HubNode({
  hub,
  refs,
  hideRelLabel,
  host,
  hide,
  exclude: panelExclude,
}: {
  hub: Hub;
  /** The hub's references, from the panel's filtered set. */
  refs: Reference[];
  hideRelLabel?: boolean;
  host: "tree" | "list";
  /** What the group around the hub already says; its member cards leave it out. */
  hide?: MemberCardHide;
  /** Records the cards' "Also linked to" leaves out; by default the hub's
   *  members and the record the panel is about. */
  exclude?: Set<string>;
}) {
  const { expanded, toggle } = useGroupExpansion({
    refIdsToWatch: hub.refIds,
    clearJumpSignal: true,
  });
  const exclude = useMemo(
    () => panelExclude ?? new Set([...hub.members.map((m) => m.entityId), ...refs.map((r) => r.sourceEntityId)]),
    [hub, refs, panelExclude],
  );
  const card = (entityId: string) => (
    <HubMemberCard
      entityId={entityId}
      refs={refs.filter((r) => r.targetEntityId === entityId)}
      hubType={hub.relationType}
      exclude={exclude}
      hide={hide}
    />
  );

  return (
    <div data-part="hub-node">
      <RelationshipRow kind="hub" hub={hub} expanded={expanded} onToggleExpand={toggle} hideRelLabel={hideRelLabel} />
      {expanded &&
        (host === "tree" ? (
          <ul data-part="hub-members" className="ms-[14px]">
            {hub.members.map((m) => (
              <TreeNode key={m.entityId}>
                <div className="py-1">{card(m.entityId)}</div>
              </TreeNode>
            ))}
          </ul>
        ) : (
          // Indented past the row's checkbox and chevron, to the pills' edge.
          <ul data-part="hub-members" className="flex flex-col gap-1.5 ps-8 pe-3 pb-2.5">
            {hub.members.map((m) => (
              <li key={m.entityId}>{card(m.entityId)}</li>
            ))}
          </ul>
        ))}
    </div>
  );
}
