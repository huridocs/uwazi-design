import { useState } from "react";
import { useSetAtom } from "jotai";
import { ShieldCheck } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { RadioGroup } from "../../shared/RadioGroup";
import { Checkbox } from "../../shared/Checkbox";
import { seedGroups, type SettingsUser, type UserRole } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const ROLE_OPTIONS = [
  { id: "admin", label: "Admin", hint: "Full access to settings and content." },
  { id: "editor", label: "Editor", hint: "Create and edit content; no settings." },
  { id: "collaborator", label: "Collaborator", hint: "Comment and suggest only." },
];

/** User detail/editor — opened from the Users list (list → detail). */
export function UserEditor({
  user,
  onClose,
}: {
  user: SettingsUser | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = user === "new";
  const base = isNew ? undefined : user;

  const [username, setUsername] = useState(base?.username ?? "");
  const [email, setEmail] = useState(base?.email ?? "");
  const [role, setRole] = useState<UserRole>(base?.role ?? "collaborator");
  const [groups, setGroups] = useState<string[]>(base?.groups ?? []);

  const dirty =
    username !== (base?.username ?? "") ||
    email !== (base?.email ?? "") ||
    role !== (base?.role ?? "collaborator") ||
    JSON.stringify(groups) !== JSON.stringify(base?.groups ?? []);

  const toggleGroup = (name: string) =>
    setGroups((prev) => (prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]));

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "User invited" : `${username || "User"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Users & Groups"]} title={isNew ? "New user" : base!.username} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          <section className="grid sm:grid-cols-2 gap-3">
            <Field label="Username">
              <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. jdoe" />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@org.example" />
            </Field>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 className="text-sm font-semibold text-ink mb-1">Role</h3>
            <p className="text-xs text-ink-tertiary mb-3">What this user can do in the collection.</p>
            <RadioGroup
              name="user-role"
              ariaLabel="Role"
              value={role}
              onChange={(v) => setRole(v as UserRole)}
              options={ROLE_OPTIONS}
            />
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 className="text-sm font-semibold text-ink mb-3">Groups</h3>
            <div className="flex flex-col gap-2">
              {seedGroups.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-paper px-3 py-2.5 cursor-pointer hover:bg-warm transition-colors"
                >
                  <Checkbox checked={groups.includes(g.name)} onChange={() => toggleGroup(g.name)} ariaLabel={g.name} />
                  <span className="text-sm font-medium text-ink flex-1">{g.name}</span>
                  <span className="text-xs text-ink-tertiary">{g.memberCount} members</span>
                </label>
              ))}
            </div>
          </section>

          {!isNew && (
            <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <h3 className="text-sm font-semibold text-ink mb-3">Two-factor authentication</h3>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-paper px-4 py-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-md bg-success-light shrink-0">
                  <ShieldCheck size={16} className="text-success" />
                </span>
                <p className="text-sm text-ink flex-1 min-w-0">
                  {base!.using2fa ? "2FA is enabled for this account." : "This account has not enabled 2FA."}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setToasts((p) => [
                      ...p,
                      { id: Date.now().toString(), message: "2FA reset for this user", type: "success" as const },
                    ])
                  }
                >
                  Reset
                </Button>
              </div>
            </section>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="success" size="sm" disabled={!dirty || !username || !email} onClick={save}>
          {isNew ? "Invite user" : "Save"}
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
