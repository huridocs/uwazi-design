import { useAtomValue, useSetAtom } from "jotai";
import { ConfirmDelete } from "./ConfirmDelete";
import { useSettingsNotify } from "../../hooks/useSettingsNotify";
import { groupUsageAtom, userUsageAtom } from "../../atoms/settingsUsage";
import { deleteGroupAtom, deleteUserAtom, type GroupWithMembers } from "../../atoms/users";
import { removeAccessMemberAtom } from "../../atoms/entityOverlay";
import type { SettingsUser } from "../../data/settings";

/** One delete dialog per Settings domain: each reads its usage selector
 *  (`atoms/settingsUsage.ts`), refuses where Uwazi refuses, performs the
 *  delete it describes, and records it (`useSettingsNotify`). Each mounts
 *  only while open, so its selector runs only then. Users and groups are
 *  here; the other domains join with their stores. */

export function UserDelete({ user, onCancel }: { user: SettingsUser | null; onCancel: () => void }) {
  return user ? <UserDeleteOpen user={user} onCancel={onCancel} /> : null;
}

function UserDeleteOpen({ user, onCancel }: { user: SettingsUser; onCancel: () => void }) {
  const usage = useAtomValue(userUsageAtom(user.id));
  const deleteUser = useSetAtom(deleteUserAtom);
  const unshare = useSetAtom(removeAccessMemberAtom);
  const { record } = useSettingsNotify();
  return (
    <ConfirmDelete
      open
      title="Delete user"
      message={`Delete ${user.username}? They can no longer sign in to this collection.`}
      impact={usage}
      onCancel={onCancel}
      onConfirm={() => {
        if (!deleteUser(user.id)) return onCancel();
        unshare(user.id);
        record({ method: "DELETE", domain: "user", noun: "user", id: user.id, name: user.username });
        onCancel();
      }}
    />
  );
}

export function GroupDelete({ group, onCancel }: { group: GroupWithMembers | null; onCancel: () => void }) {
  return group ? <GroupDeleteOpen group={group} onCancel={onCancel} /> : null;
}

function GroupDeleteOpen({ group, onCancel }: { group: GroupWithMembers; onCancel: () => void }) {
  const usage = useAtomValue(groupUsageAtom(group.id));
  const deleteGroup = useSetAtom(deleteGroupAtom);
  const unshare = useSetAtom(removeAccessMemberAtom);
  const { record } = useSettingsNotify();
  return (
    <ConfirmDelete
      open
      title="Delete group"
      message={
        group.memberCount
          ? `Delete the ${group.name} group? Its members keep their accounts.`
          : `Delete the ${group.name} group? It has no members.`
      }
      impact={usage}
      onCancel={onCancel}
      onConfirm={() => {
        deleteGroup(group.id);
        unshare(group.id);
        record({ method: "DELETE", domain: "group", noun: "group", id: group.id, name: group.name });
        onCancel();
      }}
    />
  );
}
