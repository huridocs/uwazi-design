import { useState } from "react";
import { useAtomValue } from "jotai";
import { ShieldCheck, Users } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { Select } from "../../shared/Select";
import { DrawerTabs } from "../../layout/DrawerTabs";
import { GroupDelete, UserDelete } from "../../shared/SettingsDeletes";
import { UserEditor } from "./UserEditor";
import { GroupEditor } from "./GroupEditor";
import type { SettingsUser, UserRole } from "../../../data/settings";
import {
  groupsAtom,
  signedInUserAtom,
  usersAtom,
  type GroupWithMembers,
} from "../../../atoms/users";

const roleStyle: Record<UserRole, string> = {
  // Admin is a role, not a danger: ink on vellum, the strongest neutral.
  admin: "bg-vellum text-ink",
  editor: "bg-carbon-tint text-carbon",
  collaborator: "bg-warm text-ink-secondary",
};

export function UsersPage() {
  const users = useAtomValue(usersAtom);
  const groups = useAtomValue(groupsAtom);
  const me = useAtomValue(signedInUserAtom);
  const [tab, setTab] = useState<"users" | "groups">("users");
  const [confirmUser, setConfirmUser] = useState<SettingsUser | null>(null);
  const [confirmGroup, setConfirmGroup] = useState<GroupWithMembers | null>(null);
  // Ids, not records: the editor reads the live record from the store.
  const [editingUser, setEditingUser] = useState<string | "new" | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | "new" | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const userSearch = useSettingsSearch(
    roleFilter ? users.filter((u) => u.role === roleFilter) : users,
    (u) => `${u.username} ${u.email}`,
  );
  const groupSearch = useSettingsSearch(groups, (g) => g.name);

  if (editingUser) return <UserEditor userId={editingUser} onClose={() => setEditingUser(null)} />;
  if (editingGroup) return <GroupEditor groupId={editingGroup} onClose={() => setEditingGroup(null)} />;

  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  /** The dialog refuses the signed-in account and the last admin, and says
   *  why (`userUsageAtom`). Uwazi leaves both to the server. */
  const askDeleteUser = (u: SettingsUser) => setConfirmUser(u);

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
      width: "4rem",
      cell: (u) => <RowActions label={u.username} onDelete={() => askDeleteUser(u)} />,
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
      width: "4rem",
      cell: (g) => <RowActions label={g.name} onDelete={() => setConfirmGroup(g)} />,
    },
  ];

  const search = tab === "users" ? userSearch : groupSearch;
  const addNew = () => (tab === "users" ? setEditingUser("new") : setEditingGroup("new"));

  return (
    <SettingsListPage
      component="UsersPage"
      title="Users & Groups"
      intro="Who can sign in to this collection, what each person can do, and the groups that share access."
      tabs={
        <DrawerTabs
          className=""
          activeId={tab}
          onChange={(v) => setTab(v as "users" | "groups")}
          tabs={[
            { id: "users", label: "Users", count: users.length },
            { id: "groups", label: "Groups", count: groups.length },
          ]}
        />
      }
      search={{
        value: search.query,
        onChange: search.setQuery,
        label: tab === "users" ? "Search users" : "Search groups",
      }}
      filters={
        tab === "users" && (
          <div className="w-36">
            <Select
              value={roleFilter}
              onChange={(v) => setRoleFilter(v as UserRole | "")}
              ariaLabel="Filter by role"
              options={[
                { value: "", label: "All roles" },
                { value: "admin", label: "Admin" },
                { value: "editor", label: "Editor" },
                { value: "collaborator", label: "Collaborator" },
              ]}
            />
          </div>
        )
      }
      lead={{ label: tab === "users" ? "Add user" : "Add group", onClick: addNew }}
      overlays={
        <>
          <UserDelete user={confirmUser} onCancel={() => setConfirmUser(null)} />
          <GroupDelete group={confirmGroup} onCancel={() => setConfirmGroup(null)} />
        </>
      }
    >
      {tab === "users" ? (
        <SettingsTable
          columns={userColumns}
          data={userSearch.rows}
          getRowId={(u) => u.id}
          onRowClick={(u) => setEditingUser(u.id)}
          rowAriaLabel={(u) => `Edit ${u.username}`}
          emptyState={
            <SettingsEmptyState
              icon={<Users size={16} />}
              title={roleFilter ? "No users with this role" : "No users yet"}
              hint="Invite the people who will work in this collection."
              action={{ label: "Add user", onClick: addNew }}
              query={userSearch.query}
              onClearQuery={userSearch.clear}
            />
          }
        />
      ) : (
        <SettingsTable
          columns={groupColumns}
          data={groupSearch.rows}
          getRowId={(g) => g.id}
          onRowClick={(g) => setEditingGroup(g.id)}
          rowAriaLabel={(g) => `Edit ${g.name}`}
          emptyState={
            <SettingsEmptyState
              icon={<Users size={16} />}
              title="No groups yet"
              hint="A group shares access to entities among several users."
              action={{ label: "Add group", onClick: addNew }}
              query={groupSearch.query}
              onClearQuery={groupSearch.clear}
            />
          }
        />
      )}
    </SettingsListPage>
  );
}
