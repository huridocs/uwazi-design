import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import {
  DEFAULT_SIGNED_IN_USER_ID,
  seedGroups,
  seedUsers,
  type SettingsGroupRecord,
  type SettingsUser,
  type UserRole,
} from "../data/settings";
import { createSettingsCollection, hasId, registerSettingsReset } from "./settingsCollection";

/** Users and groups — one store that Settings › Users & Groups, the login
 *  screen, the Share modal and the Dashboard read. Global, not per corpus: the
 *  people who sign in exist before a collection is picked. */
const ROLES: UserRole[] = ["admin", "editor", "collaborator"];
/** A user from storage must have every field the app reads: `groupIds` is
 *  read on the first render (login, groups), so a record without it would
 *  take the whole app down. */
const isUser = (r: unknown): boolean => {
  if (!hasId(r)) return false;
  const u = r as Partial<SettingsUser>;
  return (
    typeof u.username === "string" &&
    typeof u.email === "string" &&
    ROLES.includes(u.role as UserRole) &&
    Array.isArray(u.groupIds) &&
    u.groupIds.every((g) => typeof g === "string") &&
    typeof u.using2fa === "boolean"
  );
};
const isGroup = (r: unknown): boolean => hasId(r) && typeof (r as Partial<SettingsGroupRecord>).name === "string";

export const users = createSettingsCollection<SettingsUser>({
  name: "users",
  idPrefix: "u",
  seedOf: () => seedUsers,
  corpusScoped: false,
  isRecord: isUser,
});

export const groups = createSettingsCollection<SettingsGroupRecord>({
  name: "groups",
  idPrefix: "g",
  seedOf: () => seedGroups,
  corpusScoped: false,
  isRecord: isGroup,
});

export const usersAtom = users.listAtom;

export interface GroupWithMembers extends SettingsGroupRecord {
  memberIds: string[];
  memberCount: number;
}

/** Groups with their members, derived from the users that list each id. */
export const groupsAtom = atom<GroupWithMembers[]>((get) => {
  const all = get(usersAtom);
  return get(groups.listAtom).map((g) => {
    const memberIds = all.filter((u) => u.groupIds.includes(g.id)).map((u) => u.id);
    return { ...g, memberIds, memberCount: memberIds.length };
  });
});

/** Who is signed in. Session storage, like the rest of the visit's state; the
 *  login screen writes it. */
const storage = createJSONStorage<string>(() => {
  try {
    return sessionStorage;
  } catch {
    return undefined as unknown as Storage;
  }
});
export const signedInUserIdAtom = atomWithStorage<string>("uwazi:signedInUser", DEFAULT_SIGNED_IN_USER_ID, storage, {
  getOnInit: true,
});
// After the users store has reset (it registered first): whoever is signed in
// stays signed in if their account is still there, a seed account; otherwise
// the default admin, and the Dashboard says so.
registerSettingsReset((set, get) => {
  const id = get(signedInUserIdAtom);
  if (!get(usersAtom).some((u) => u.id === id)) set(signedInUserIdAtom, DEFAULT_SIGNED_IN_USER_ID);
});

/** The signed-in user's record. Falls back to the first admin if the stored id
 *  no longer exists (the store was reset under it). */
export const signedInUserAtom = atom<SettingsUser | undefined>((get) => {
  const all = get(usersAtom);
  const id = get(signedInUserIdAtom);
  return all.find((u) => u.id === id) ?? all.find((u) => u.role === "admin");
});

/* ── Rules Uwazi enforces only on the server (inventory Part 0.8 #2) ───────
   The prototype has no server, so the UI blocks these up front and says why. */

/** Why `id` cannot be deleted, or null. */
export function userDeleteBlock(all: SettingsUser[], signedInId: string | undefined, id: string): string | null {
  if (id === signedInId) return "You can't delete the account you're signed in with.";
  const u = all.find((x) => x.id === id);
  if (u?.role === "admin" && all.filter((x) => x.role === "admin").length === 1)
    return "This is the last admin. Make another user an admin first.";
  return null;
}

/** Why `id` cannot take `role`, or null. */
export function roleChangeBlock(all: SettingsUser[], id: string, role: UserRole): string | null {
  const u = all.find((x) => x.id === id);
  if (u?.role === "admin" && role !== "admin" && all.filter((x) => x.role === "admin").length === 1)
    return "This is the last admin, so the role stays Admin.";
  return null;
}

/** Why `username` or `email` is already taken, or null. Uwazi rejects both
 *  duplicates; compared trimmed and case-insensitively, as login matches. */
export function userIdentityBlock(
  all: SettingsUser[],
  id: string | null,
  { username, email }: { username: string; email: string },
): { username?: string; email?: string } | null {
  const fold = (s: string) => s.trim().toLowerCase();
  const others = all.filter((u) => u.id !== id);
  const out: { username?: string; email?: string } = {};
  if (username.trim() && others.some((u) => fold(u.username) === fold(username))) out.username = "Already exists";
  if (email.trim() && others.some((u) => fold(u.email) === fold(email))) out.email = "Already exists";
  return out.username || out.email ? out : null;
}

/** Save a user from the editor. `id` null creates. Returns the id, or null
 *  when the store refuses: a duplicate username or email, or a role change
 *  that would leave no admin. The editors check the same rules first and say
 *  why; this keeps any other caller (bulk actions, Bert) inside them. */
export const saveUserAtom = atom(
  null,
  (get, set, { id, value }: { id: string | null; value: Omit<SettingsUser, "id"> }): string | null => {
    const all = get(usersAtom);
    if (userIdentityBlock(all, id, value)) return null;
    if (id && roleChangeBlock(all, id, value.role)) return null;
    if (!id) return set(users.createAtom, { value });
    if (!all.some((u) => u.id === id)) return null;
    set(users.patchAtom, { id, patch: value });
    return id;
  },
);

/** Unlock an account Uwazi locked after failed sign-ins (SD-2). */
export const unlockUserAtom = atom(null, (get, set, id: string) => {
  if (get(usersAtom).some((u) => u.id === id && u.locked)) set(users.patchAtom, { id, patch: { locked: false } });
});

/** Save a group: its name, and its membership written onto each user whose
 *  membership changed. `id` null creates; returns the id. */
export const saveGroupAtom = atom(
  null,
  (get, set, { id, name, memberIds }: { id: string | null; name: string; memberIds: string[] }): string | null => {
    // A group deleted under an open editor is not re-created by its Save.
    if (id && !get(groups.listAtom).some((g) => g.id === id)) return null;
    const gid = id ?? set(groups.createAtom, { value: { name } });
    if (id) set(groups.patchAtom, { id, patch: { name } });
    const want = new Set(memberIds);
    for (const u of get(usersAtom)) {
      const has = u.groupIds.includes(gid);
      if (has === want.has(u.id)) continue;
      set(users.patchAtom, {
        id: u.id,
        patch: { groupIds: has ? u.groupIds.filter((g) => g !== gid) : [...u.groupIds, gid] },
      });
    }
    return gid;
  },
);

/** Delete a group and take it off every member. Members keep their accounts. */
export const deleteGroupAtom = atom(null, (get, set, id: string) => {
  for (const u of get(usersAtom))
    if (u.groupIds.includes(id))
      set(users.patchAtom, { id: u.id, patch: { groupIds: u.groupIds.filter((g) => g !== id) } });
  set(groups.deleteAtom, { id });
});

/** Delete a user unless it is the signed-in account or the last admin.
 *  Returns whether it was deleted. */
export const deleteUserAtom = atom(null, (get, set, id: string): boolean => {
  if (userDeleteBlock(get(usersAtom), get(signedInUserAtom)?.id, id)) return false;
  set(users.deleteAtom, { id });
  return true;
});

/* ── Bulk (UX2) ────────────────────────────────────────────────────────────
   A selection is planned before it is applied, one user at a time against
   the list as it will be, so "the last admin" means the last one after the
   others in the selection have changed. The readback and the write use the
   same plan. */

export interface BulkPlan {
  /** Users the action changes. */
  apply: string[];
  /** Users it leaves alone because they already match. */
  same: string[];
  /** Users it refuses, and why. */
  blocked: { id: string; username: string; reason: string }[];
}

export function planRoleChange(all: SettingsUser[], signedInId: string | undefined, ids: string[], role: UserRole): BulkPlan {
  let list = all;
  const plan: BulkPlan = { apply: [], same: [], blocked: [] };
  for (const id of ids) {
    const u = list.find((x) => x.id === id);
    if (!u) continue;
    if (u.role === role) plan.same.push(id);
    else if (id === signedInId) plan.blocked.push({ id, username: u.username, reason: "You can't change your own role." });
    else {
      const block = roleChangeBlock(list, id, role);
      if (block) plan.blocked.push({ id, username: u.username, reason: block });
      else {
        plan.apply.push(id);
        list = list.map((x) => (x.id === id ? { ...x, role } : x));
      }
    }
  }
  return plan;
}

export function planUserDelete(all: SettingsUser[], signedInId: string | undefined, ids: string[]): BulkPlan {
  let list = all;
  const plan: BulkPlan = { apply: [], same: [], blocked: [] };
  for (const id of ids) {
    const u = list.find((x) => x.id === id);
    if (!u) continue;
    const block = userDeleteBlock(list, signedInId, id);
    if (block) plan.blocked.push({ id, username: u.username, reason: block });
    else {
      plan.apply.push(id);
      list = list.filter((x) => x.id !== id);
    }
  }
  return plan;
}

export function planAddToGroup(all: SettingsUser[], ids: string[], groupId: string): BulkPlan {
  const plan: BulkPlan = { apply: [], same: [], blocked: [] };
  for (const id of ids) {
    const u = all.find((x) => x.id === id);
    if (!u) continue;
    (u.groupIds.includes(groupId) ? plan.same : plan.apply).push(id);
  }
  return plan;
}

export const bulkSetRoleAtom = atom(null, (get, set, { ids, role }: { ids: string[]; role: UserRole }): BulkPlan => {
  const plan = planRoleChange(get(usersAtom), get(signedInUserAtom)?.id, ids, role);
  for (const id of plan.apply) set(users.patchAtom, { id, patch: { role } });
  return plan;
});

export const bulkAddToGroupAtom = atom(null, (get, set, { ids, groupId }: { ids: string[]; groupId: string }): BulkPlan => {
  const all = get(usersAtom);
  const plan = planAddToGroup(all, ids, groupId);
  for (const id of plan.apply) {
    const u = all.find((x) => x.id === id)!;
    set(users.patchAtom, { id, patch: { groupIds: [...u.groupIds, groupId] } });
  }
  return plan;
});

export const bulkDeleteUsersAtom = atom(null, (get, set, ids: string[]): BulkPlan => {
  const plan = planUserDelete(get(usersAtom), get(signedInUserAtom)?.id, ids);
  for (const id of plan.apply) set(users.deleteAtom, { id });
  return plan;
});
