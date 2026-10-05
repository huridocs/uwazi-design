import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsTable, type Column } from "../SettingsTable";
import { DrawerTabs } from "../../layout/DrawerTabs";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { UserEditor } from "./UserEditor";
import { GroupEditor } from "./GroupEditor";
import type { SettingsUser, UserRole } from "../../../data/settings";
import {
  deleteGroupAtom,
  deleteUserAtom,
  groupsAtom,
  signedInUserAtom,
  userDeleteBlock,
  usersAtom,
  type GroupWithMembers,
} from "../../../atoms/users";
import { useNotify } from "../../../hooks/useNotify";

const roleStyle: Record<UserRole, string> = {
  admin: "bg-seal-tint text-seal-label",
  editor: "bg-carbon-tint text-carbon",
  collaborator: "bg-warm text-ink-secondary",
};

export function UsersPage() {
  const notify = useNotify();
  const users = useAtomValue(usersAtom);
  const groups = useAtomValue(groupsAtom);
  const me = useAtomValue(signedInUserAtom);
  const deleteUser = useSetAtom(deleteUserAtom);
  const deleteGroup = useSetAtom(deleteGroupAtom);
  const [tab, setTab] = useState<"users" | "groups">("users");
  const [confirmUser, setConfirmUser] = useState<SettingsUser | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [confirmGroup, setConfirmGroup] = useState<GroupWithMembers | null>(null);
  // Ids, not records: the editor reads the live record from the store.
  const [editingUser, setEditingUser] = useState<string | "new" | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | "new" | null>(null);

  if (editingUser) return <UserEditor userId={editingUser} onClose={() => setEditingUser(null)} />;
  if (editingGroup) return <GroupEditor groupId={editingGroup} onClose={() => setEditingGroup(null)} />;

  const toast = (message: string) => notify(message, "success");
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  /** Delete, unless it would remove the signed-in account or the last admin;
   *  then say why instead. Uwazi leaves both to the server. */
  const askDeleteUser = (u: SettingsUser) => {
    const reason = userDeleteBlock(users, me?.id, u.id);
    if (reason) setBlocked(reason);
    else setConfirmUser(u);
  };

  const userColumns: Column<SettingsUser>[] = [
    {
      id: "user",
      header: "User",
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-vellum text-meta font-semibold text-ink-secondary uppercase shrink-0">
            {u.username.slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-ink truncate">
              {u.username}
              {u.id === me?.id && <span className="ms-1.5 text-xs font-normal text-ink-tertiary">(you)</span>}
            </p>
            <p className="text-xs text-ink-tertiary truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      width: "8rem",
      cell: (u) => (
        <span className={`text-meta font-semibold px-2 py-0.5 rounded-md w-fit capitalize ${roleStyle[u.role]}`}>
          {u.role}
        </span>
      ),
    },
    {
      id: "groups",
      header: "Groups",
      cell: (u) =>
        u.groupIds.length === 0 ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {u.groupIds.map((g) => (
              <span key={g} className="text-meta text-ink-secondary bg-warm px-1.5 py-0.5 rounded w-fit">
                {groupName.get(g) ?? g}
              </span>
            ))}
          </div>
        ),
    },
    {
      id: "2fa",
      header: "2FA",
      align: "center",
      width: "4rem",
      cell: (u) =>
        u.using2fa ? (
          <ShieldCheck size={15} className="text-success mx-auto" />
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "6rem",
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditingUser(u.id); }}
            aria-label={`Edit ${u.username}`}
            className="p-1.5 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); askDeleteUser(u); }}
            aria-label={`Delete ${u.username}`}
            className="p-1.5 rounded-md text-ink-tertiary hover:bg-seal-tint hover:text-seal-label transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const groupColumns: Column<GroupWithMembers>[] = [
    { id: "name", header: "Group", cell: (g) => <span className="font-medium text-ink">{g.name}</span> },
    {
      id: "members",
      header: "Members",
      width: "8rem",
      cell: (g) => <span className="text-ink-secondary">{g.memberCount}</span>,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "6rem",
      cell: (g) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditingGroup(g.id); }}
            aria-label={`Edit ${g.name}`}
            className="p-1.5 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmGroup(g); }}
            aria-label={`Delete ${g.name}`}
            className="p-1.5 rounded-md text-ink-tertiary hover:bg-seal-tint hover:text-seal-label transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <SettingsContent component="UsersPage">
      <SettingsContent.Header title="Users & Groups" />
      <SettingsContent.Body>
        <div className="mb-4">
          <DrawerTabs
            className=""
            activeId={tab}
            onChange={(v) => setTab(v as "users" | "groups")}
            tabs={[
              { id: "users", label: "Users", count: users.length },
              { id: "groups", label: "Groups", count: groups.length },
            ]}
          />
        </div>
        {tab === "users" ? (
          <SettingsTable columns={userColumns} data={users} getRowId={(u) => u.id} onRowClick={(u) => setEditingUser(u.id)} rowAriaLabel={(u) => `Edit ${u.username}`} />
        ) : (
          <SettingsTable columns={groupColumns} data={groups} getRowId={(g) => g.id} onRowClick={(g) => setEditingGroup(g.id)} rowAriaLabel={(g) => `Edit ${g.name}`} />
        )}
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton
          variant="primary"
          size="sm"
          className="me-auto"
          icon={<Plus size={14} />}
          onClick={() => (tab === "users" ? setEditingUser("new") : setEditingGroup("new"))}
        >
          {tab === "users" ? "Add user" : "Add group"}
        </SettingsButton>
      </SettingsContent.Footer>

      <ConfirmDialog
        open={confirmUser !== null}
        title="Delete user"
        message={`Delete ${confirmUser?.username}? They will lose access to this collection.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmUser) {
            deleteUser(confirmUser.id);
            toast(`${confirmUser.username} deleted`);
          }
          setConfirmUser(null);
        }}
        onCancel={() => setConfirmUser(null)}
      />
      <ConfirmDialog
        open={confirmGroup !== null}
        title="Delete group"
        message={
          !confirmGroup?.memberCount
            ? `Delete the ${confirmGroup?.name} group? It has no members.`
            : confirmGroup.memberCount === 1
              ? `Delete the ${confirmGroup.name} group? Its member keeps their account.`
              : `Delete the ${confirmGroup.name} group? Its ${confirmGroup.memberCount} members keep their accounts.`
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmGroup) {
            deleteGroup(confirmGroup.id);
            toast(`${confirmGroup.name} deleted`);
          }
          setConfirmGroup(null);
        }}
        onCancel={() => setConfirmGroup(null)}
      />
      <ConfirmDialog
        open={blocked !== null}
        title="Can't delete this user"
        message={blocked ?? ""}
        confirmLabel="OK"
        cancelLabel={null}
        onConfirm={() => setBlocked(null)}
        onCancel={() => setBlocked(null)}
      />
    </SettingsContent>
  );
}
