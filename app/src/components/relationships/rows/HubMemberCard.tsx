import type { Reference } from "../../../data/references";
import { MemberCard, type MemberCardHide } from "./MemberCard";

/** One member of an open hub: the Library's list card, scaled down. The hub
 *  row above already names every member; this is where a member says more than
 *  its name. The link type is printed only where it differs from the hub's. */
export function HubMemberCard({
  entityId,
  refs,
  hubType,
  exclude,
  hide,
}: {
  entityId: string;
  /** This member's references to the hub, from the panel's filtered set. */
  refs: Reference[];
  /** The hub's link type. */
  hubType: string;
  /** Records the quiet line leaves out: the focused record and the hub's
   *  members, which the row above already shows. */
  exclude: Set<string>;
  /** What the group around the hub already says (List). */
  hide?: MemberCardHide;
}) {
  return <MemberCard variant="card" entityId={entityId} refs={refs} exclude={exclude} hide={{ ...hide, title: false, relation: hubType }} />;
}
