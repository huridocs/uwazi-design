import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Lock, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { Hint } from "../../shared/Hint";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { Select } from "../../shared/Select";
import { DrawerTabs } from "../../layout/DrawerTabs";
import { GroupDelete, UserDelete } from "../../shared/SettingsDeletes";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { BulkPickModal } from "../BulkPickModal";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { removeAccessMemberAtom } from "../../../atoms/entityOverlay";
import { UserEditor } from "./UserEditor";
import { GroupEditor } from "./GroupEditor";
import type { SettingsUser, UserRole } from "../../../data/settings";
import {
  groupsAtom,
  signedInUserAtom,
  usersAtom,
  bulkAddToGroupAtom,
  bulkDeleteUsersAtom,
  bulkSetRoleAtom,
  planAddToGroup,
  planRoleChange,
  planUserDelete,
  type BulkPlan,
  type GroupWithMembers,
} from "../../../atoms/users";

const ROLE_LABEL: Record<UserRole, string> = { admin: "Admin", editor: "Editor", collaborator: "Collaborator" };
const people = (n: number) => `${n.toLocaleString()} ${n === 1 ? "user" : "users"}`;
/** "admin stays: This is the last admin…" — one line per refused user. */
const blockedLines = (plan: BulkPlan) => plan.blocked.map((b) => `${b.username} stays: ${b.reason}`);

const roleStyle: Record<UserRole, string> = {
  // Admin is a role, not a danger: ink on vellum, the strongest neutral.
  admin: "bg-vellum text-ink",
  editor: "bg-carbon-tint text-carbon-label",
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
  // Ticked users (UX2). Ids of users that no longer exist drop out, and
  // switching tab clears the selection (Uwazi).
  const [tickedRaw, setTicked] = useState<Set<string>>(new Set());
  const ticked = new Set([...tickedRaw].filter((id) => users.some((u) => u.id === id)));
  const tickedIds = [...ticked];
  const [bulk, setBulk] = useState<"group" | "role" | "delete" | null>(null);
  const addToGroup = useSetAtom(bulkAddToGroupAtom);
  const setRole = useSetAtom(bulkSetRoleAtom);
  const deleteUsers = useSetAtom(bulkDeleteUsersAtom);
  const unshare = useSetAtom(removeAccessMemberAtom);
  const { record } = useSettingsNotify();

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
            <p className={`flex items-center gap-1.5 font-medium truncate ${u.locked ? "text-seal-label" : "text-ink"}`}>
              <span className="truncate">{u.username}</span>
              {u.locked && (
                <Hint text="Account locked">
                  {(hint) => (
                    <span {...hint} tabIndex={0} aria-label="Account locked" className="relative inline-flex shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-carbon">
                      <Lock size={12} aria-hidden />
                    </span>
                  )}
                </Hint>
              )}
              {u.id === me?.id && <span className="text-xs font-normal text-ink-tertiary">(you)</span>}
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
          <span className="text-ink-tertiary">—</span>
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
      // Uwazi's Protection column: a pill that reads the account's 2FA flag.
      header: "Protection",
      width: "8.5rem",
      cell: (u) =>
        u.using2fa ? (
          <span className="text-meta font-semibold px-2 py-0.5 rounded-md w-fit whitespace-nowrap bg-success-light text-success-label">
            Password + 2fa
          </span>
        ) : (
          <span className="text-meta font-semibold px-2 py-0.5 rounded-md w-fit bg-warm text-ink-secondary">Password</span>
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

  const nameOf = (id: string) => users.find((u) => u.id === id)?.username ?? id;
  /** One log entry per user, one Beacon card for the action. */
  const report = (plan: BulkPlan, message: string, entry: (id: string) => { method: "UPDATE" | "DELETE"; summary: string }) => {
    for (const id of plan.apply)
      record({ ...entry(id), domain: "user", noun: "user", id, name: nameOf(id), notify: false });
    record({
      log: false,
      method: "UPDATE",
      domain: "user",
      noun: "users",
      name: "Users",
      message,
      ...(plan.blocked.length ? { detail: blockedLines(plan).join(" ") } : {}),
    });
  };
  const selection =
    tab === "users"
      ? {
          count: ticked.size,
          total: users.length,
          onClear: () => setTicked(new Set()),
          actions: [
            {
              id: "group",
              label: "Add to group",
              icon: <UserPlus size={13} />,
              onClick: () => setBulk("group" as const),
              disabledReason: groups.length ? undefined : "There are no groups yet",
            },
            { id: "role", label: "Change role", icon: <Shield size={13} />, onClick: () => setBulk("role" as const) },
            { id: "delete", label: "Delete", icon: <Trash2 size={13} />, onClick: () => setBulk("delete" as const), danger: true },
          ],
        }
      : undefined;
  const deletePlan = bulk === "delete" ? planUserDelete(users, me?.id, tickedIds) : null;

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
          onChange={(v) => {
            setTab(v as "users" | "groups");
            setTicked(new Set());
          }}
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
      selection={selection}
      overlays={
        <>
          {bulk === "group" && (
            <BulkPickModal
              title="Add to group"
              subtitle={people(ticked.size)}
              confirmLabel="Add to group"
              options={groups.map((g) => ({ value: g.id, label: g.name, meta: `${g.memberCount} ${g.memberCount === 1 ? "member" : "members"}` }))}
              readback={(gid) => {
                const plan = planAddToGroup(users, tickedIds, gid);
                const name = groupName.get(gid);
                if (!plan.apply.length) return { text: `All ${people(ticked.size)} are already in ${name}.`, none: true };
                return {
                  text: `${people(plan.apply.length)} join ${name}.${plan.same.length ? ` ${people(plan.same.length)} already ${plan.same.length === 1 ? "is" : "are"} a member.` : ""}`,
                };
              }}
              onClose={() => setBulk(null)}
              onConfirm={(gid) => {
                const plan = addToGroup({ ids: tickedIds, groupId: gid });
                const name = groupName.get(gid) ?? gid;
                report(plan, `${people(plan.apply.length)} added to ${name}`, () => ({ method: "UPDATE", summary: `Added user to group “${name}”` }));
                setBulk(null);
                setTicked(new Set());
              }}
            />
          )}
          {bulk === "role" && (
            <BulkPickModal
              title="Change role"
              subtitle={people(ticked.size)}
              confirmLabel="Change role"
              options={(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
              readback={(r) => {
                const plan = planRoleChange(users, me?.id, tickedIds, r as UserRole);
                const parts = [
                  plan.apply.length ? `${people(plan.apply.length)} become ${ROLE_LABEL[r as UserRole]}.` : "",
                  plan.same.length ? `${people(plan.same.length)} already ${plan.same.length === 1 ? "is" : "are"}.` : "",
                  ...blockedLines(plan),
                ].filter(Boolean);
                return { text: parts.join(" "), none: plan.apply.length === 0 };
              }}
              onClose={() => setBulk(null)}
              onConfirm={(r) => {
                const role = r as UserRole;
                const plan = setRole({ ids: tickedIds, role });
                report(plan, `${people(plan.apply.length)} now ${ROLE_LABEL[role]}`, () => ({ method: "UPDATE", summary: `Changed role to ${ROLE_LABEL[role]}` }));
                setBulk(null);
                // Refused users stay ticked, so the reason can be acted on.
                setTicked(new Set(plan.blocked.map((b) => b.id)));
              }}
            />
          )}
          <ConfirmDelete
            open={!!deletePlan}
            title="Delete users"
            message={
              deletePlan && deletePlan.apply.length
                ? `Delete ${deletePlan.apply.map(nameOf).join(", ")}? They can no longer sign in to this collection.`
                : "None of the selected users can be deleted."
            }
            impact={
              deletePlan
                ? {
                    lines: [
                      ...(() => {
                        const left = new Set(deletePlan.apply);
                        const touched = groups.filter((g) => g.memberIds.some((id) => left.has(id)));
                        return touched.length ? [`They leave ${touched.map((g) => g.name).join(", ")}.`] : [];
                      })(),
                      ...blockedLines(deletePlan),
                    ],
                    block: deletePlan.apply.length ? null : deletePlan.blocked[0]?.reason ?? null,
                  }
                : null
            }
            confirmLabel={deletePlan && deletePlan.apply.length > 1 ? `Delete ${deletePlan.apply.length}` : "Delete"}
            onCancel={() => setBulk(null)}
            onConfirm={() => {
              const names = new Map(tickedIds.map((id) => [id, nameOf(id)]));
              const plan = deleteUsers(tickedIds);
              for (const id of plan.apply) {
                unshare(id);
                record({ method: "DELETE", domain: "user", noun: "user", id, name: names.get(id) ?? id, notify: false });
              }
              record({
                log: false,
                method: "DELETE",
                domain: "user",
                noun: "users",
                name: "Users",
                message: `${people(plan.apply.length)} deleted`,
                ...(plan.blocked.length ? { detail: blockedLines(plan).join(" ") } : {}),
              });
              setBulk(null);
              setTicked(new Set(plan.blocked.map((b) => b.id)));
            }}
          />
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
          selection={{ selected: ticked, onChange: setTicked, label: (u) => u.username }}
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
