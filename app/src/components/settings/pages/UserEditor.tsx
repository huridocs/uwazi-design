import { useId } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ShieldCheck } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsField, TextInput } from "../SettingsField";
import { RadioGroup } from "../../shared/RadioGroup";
import { Checkbox } from "../../shared/Checkbox";
import type { SettingsUser, UserRole } from "../../../data/settings";
import { groupsAtom, roleChangeBlock, saveUserAtom, usersAtom } from "../../../atoms/users";
import { useNotify } from "../../../hooks/useNotify";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";

const ROLE_OPTIONS = [
  { id: "admin", label: "Admin", hint: "Full access to settings and content." },
  { id: "editor", label: "Editor", hint: "Create and edit content; no settings." },
  { id: "collaborator", label: "Collaborator", hint: "Comment and suggest only." },
];

type UserDraft = Omit<SettingsUser, "id">;

const NEW_USER: UserDraft = { username: "", email: "", role: "collaborator", groupIds: [], using2fa: false };

/** User detail/editor — opened from the Users list (list → detail). Saves to
 *  the users store (`atoms/users.ts`). */
export function UserEditor({
  userId,
  onClose,
}: {
  userId: string | "new";
  onClose: () => void;
}) {
  const notify = useNotify();
  const users = useAtomValue(usersAtom);
  const groups = useAtomValue(groupsAtom);
  const saveUser = useSetAtom(saveUserAtom);
  const isNew = userId === "new";
  const base = isNew ? undefined : users.find((u) => u.id === userId);
  const { id: _id, ...saved } = base ?? { id: "", ...NEW_USER };

  const { draft, update, dirty } = useSettingsDraft<UserDraft>({
    id: `user:${userId}`,
    label: "User edits",
    saved,
  });
  const { username, email, role, groupIds } = draft;
  const groupsHeadingId = useId();
  const roleNote = base ? roleChangeBlock(users, base.id, "editor") : null;
  const valid = !!username.trim() && !!email.trim();

  const toggleGroup = (id: string) =>
    update({ groupIds: groupIds.includes(id) ? groupIds.filter((g) => g !== id) : [...groupIds, id] });

  const save = () => {
    saveUser({ id: base?.id ?? null, value: { ...draft, username: username.trim(), email: email.trim() } });
    notify(isNew ? "User invited" : `${username.trim()} saved`, "success");
    onClose();
  };

  return (
    <SettingsContent component="UserEditor">
      <SettingsContent.Header path={["Users & Groups"]} title={isNew ? "New user" : base?.username ?? ""} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          <section className="grid sm:grid-cols-2 gap-3">
            <SettingsField label="Username">
              <TextInput value={username} onChange={(e) => update({ username: e.target.value })} placeholder="e.g. jdoe" />
            </SettingsField>
            <SettingsField label="Email">
              <TextInput type="email" value={email} onChange={(e) => update({ email: e.target.value })} placeholder="name@org.example" />
            </SettingsField>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 className="text-sm font-semibold text-ink mb-1">Role</h3>
            <p className="text-xs text-ink-tertiary mb-3">What this user can do in the collection.</p>
            <RadioGroup
              name="user-role"
              ariaLabel="Role"
              value={role}
              onChange={(v) => update({ role: v as UserRole })}
              // The last admin stays one: Uwazi leaves this to the server.
              options={ROLE_OPTIONS.map((o) => ({ ...o, disabled: !!roleNote && o.id !== "admin" }))}
            />
            {roleNote && <p data-part="role-note" className="mt-2 text-xs text-ink-tertiary">{roleNote}</p>}
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 id={groupsHeadingId} className="text-sm font-semibold text-ink mb-3">Groups</h3>
            {/* A set of checkboxes answering one question: a fieldset, named by the
                section heading above it (a legend would draw into the rule). */}
            <fieldset aria-labelledby={groupsHeadingId} data-part="groups" className="flex flex-col gap-2 min-w-0">
              {groups.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-paper px-3 py-2.5 cursor-pointer hover:bg-warm transition-colors"
                >
                  <Checkbox checked={groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} ariaLabel={g.name} />
                  <span className="text-sm font-medium text-ink flex-1">{g.name}</span>
                  <span className="text-xs text-ink-tertiary">{g.memberCount} {g.memberCount === 1 ? "member" : "members"}</span>
                </label>
              ))}
            </fieldset>
          </section>

          {!isNew && (
            <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <h3 className="text-sm font-semibold text-ink mb-3">Two-factor authentication</h3>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-paper px-4 py-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-md bg-success-light shrink-0">
                  <ShieldCheck size={16} aria-hidden className="text-success" />
                </span>
                <p className="text-sm text-ink flex-1 min-w-0">
                  {base?.using2fa ? "2FA is enabled for this account." : "This account has not enabled 2FA."}
                </p>
                <SettingsButton
                  variant="secondary"
                  size="sm"
                  onClick={() => notify("2FA reset for this user", "success")}
                >
                  Reset
                </SettingsButton>
              </div>
            </section>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="ghost" size="sm" onClick={onClose}>Cancel</SettingsButton>
        <SettingsButton variant={isNew ? "commit" : "success"} size="sm" disabled={!dirty || !valid} onClick={save}>
          {isNew ? "Invite user" : "Save"}
        </SettingsButton>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
