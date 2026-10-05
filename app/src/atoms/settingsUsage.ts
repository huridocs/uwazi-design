import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import { groupUsage, userUsage } from "../utils/settingsUsage";
import { entityAccessAtom } from "./entityOverlay";
import { groupsAtom, signedInUserAtom, userDeleteBlock, usersAtom } from "./users";

/** What a settings record is used by, for its delete dialog (pure logic in
 *  `utils/settingsUsage.ts`). This stage carries users and groups; the other
 *  domains join with their stores. */

/* ── Users and groups ──────────────────────────────────────────────────── */

/** Entities shared with a user or group by name in the Share modal. */
const sharesOf = (access: Record<string, { id: string }[]>, memberId: string) =>
  Object.values(access).filter((list) => list.some((m) => m.id === memberId)).length;

export const groupUsageAtom = atomFamily((groupId: string) =>
  atom((get) => {
    const g = get(groupsAtom).find((x) => x.id === groupId);
    const users = get(usersAtom);
    const members = (g?.memberIds ?? []).map((id) => users.find((u) => u.id === id)?.username ?? id);
    return groupUsage({ members, shares: sharesOf(get(entityAccessAtom), groupId) });
  }),
);

export const userUsageAtom = atomFamily((userId: string) =>
  atom((get) => {
    const users = get(usersAtom);
    const u = users.find((x) => x.id === userId);
    const groups = get(groupsAtom)
      .filter((g) => u?.groupIds.includes(g.id))
      .map((g) => g.name);
    return userUsage({
      block: userDeleteBlock(users, get(signedInUserAtom)?.id, userId),
      groups,
      shares: sharesOf(get(entityAccessAtom), userId),
    });
  }),
);
