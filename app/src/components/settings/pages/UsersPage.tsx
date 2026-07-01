import { useState } from "react";
import { useSetAtom } from "jotai";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { DrawerTabs } from "../../layout/DrawerTabs";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { UserEditor } from "./UserEditor";
import { GroupEditor } from "./GroupEditor";
import {
  seedUsers,
  seedGroups,
  type SettingsUser,
  type SettingsGroupRecord,
  type UserRole,
} from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const roleStyle: Record<UserRole, string> = {
  admin: "bg-seal-tint text-seal",
  editor: "bg-carbon-tint text-carbon",
  collaborator: "bg-warm text-ink-secondary",
};

export function UsersPage() {
  const setToasts = useSetAtom(toastsAtom);
  const [tab, setTab] = useState<"users" | "groups">("users");
  const [users, setUsers] = useState<SettingsUser[]>(seedUsers);
  const [groups, setGroups] = useState<SettingsGroupRecord[]>(seedGroups);
  const [confirmUser, setConfirmUser] = useState<SettingsUser | null>(null);
  const [confirmGroup, setConfirmGroup] = useState<SettingsGroupRecord | null>(null);
  const [editingUser, setEditingUser] = useState<SettingsUser | "new" | null>(null);
  const [editingGroup, setEditingGroup] = useState<SettingsGroupRecord | "new" | null>(null);

  if (editingUser) return <UserEditor user={editingUser} onClose={() => setEditingUser(null)} />;
  if (editingGroup) return <GroupEditor group={editingGroup} onClose={() => setEditingGroup(null)} />;

  const toast = (message: string) =>
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type: "success" as const }]);

  const userColumns: Column<SettingsUser>[] = [
    {
      id: "user",
      header: "User",
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-vellum text-[11px] font-semibold text-ink-secondary uppercase shrink-0">
            {u.username.slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-ink truncate">{u.username}</p>
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
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md w-fit capitalize ${roleStyle[u.role]}`}>
          {u.role}
        </span>
      ),
    },
    {
      id: "groups",
      header: "Groups",
      cell: (u) =>
        u.groups.length === 0 ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {u.groups.map((g) => (
              <span key={g} className="text-[11px] text-ink-secondary bg-warm px-1.5 py-0.5 rounded w-fit">
                {g}
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
            onClick={(e) => { e.stopPropagation(); setEditingUser(u); }}
            aria-label={`Edit ${u.username}`}
            className="p-1.5 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmUser(u); }}
            aria-label={`Delete ${u.username}`}
            className="p-1.5 rounded-md text-ink-tertiary hover:bg-seal-tint hover:text-seal transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const groupColumns: Column<SettingsGroupRecord>[] = [
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
            onClick={(e) => { e.stopPropagation(); setEditingGroup(g); }}
            aria-label={`Edit ${g.name}`}
            className="p-1.5 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmGroup(g); }}
            aria-label={`Delete ${g.name}`}
            className="p-1.5 rounded-md text-ink-tertiary hover:bg-seal-tint hover:text-seal transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <SettingsContent>
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
          <Table columns={userColumns} data={users} getRowId={(u) => u.id} onRowClick={(u) => setEditingUser(u)} />
        ) : (
          <Table columns={groupColumns} data={groups} getRowId={(g) => g.id} onRowClick={(g) => setEditingGroup(g)} />
        )}
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button
          variant="primary"
          size="sm"
          className="me-auto"
          icon={<Plus size={14} />}
          onClick={() => (tab === "users" ? setEditingUser("new") : setEditingGroup("new"))}
        >
          {tab === "users" ? "Add user" : "Add group"}
        </Button>
      </SettingsContent.Footer>

      <ConfirmDialog
        open={confirmUser !== null}
        title="Delete user"
        message={`Delete ${confirmUser?.username}? They will lose access to this collection.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmUser) {
            setUsers((prev) => prev.filter((u) => u.id !== confirmUser.id));
            toast(`${confirmUser.username} deleted`);
          }
          setConfirmUser(null);
        }}
        onCancel={() => setConfirmUser(null)}
      />
      <ConfirmDialog
        open={confirmGroup !== null}
        title="Delete group"
        message={`Delete the ${confirmGroup?.name} group? Members keep their accounts.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmGroup) {
            setGroups((prev) => prev.filter((g) => g.id !== confirmGroup.id));
            toast(`${confirmGroup.name} deleted`);
          }
          setConfirmGroup(null);
        }}
        onCancel={() => setConfirmGroup(null)}
      />
    </SettingsContent>
  );
}
