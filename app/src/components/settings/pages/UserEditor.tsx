import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ShieldCheck } from "lucide-react";
import { SettingsButton } from "../SettingsButton";
import { SettingsEditor } from "../SettingsEditor";
import { SettingsCheckList, SettingsCheckRow, SettingsFieldRow, SettingsSection } from "../SettingsSection";
import { SettingsField, TextInput } from "../SettingsField";
import { RadioGroup } from "../../shared/RadioGroup";
import { Checkbox } from "../../shared/Checkbox";
import type { SettingsUser, UserRole } from "../../../data/settings";
import { groupsAtom, roleChangeBlock, saveUserAtom, signedInUserAtom, unlockUserAtom, userIdentityBlock, users as usersStore, usersAtom } from "../../../atoms/users";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { MissingRecord } from "../../shared/MissingRecord";
import { PasswordConfirmModal } from "../../shared/PasswordConfirmModal";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { LastSavedLine } from "../../shared/LastSavedLine";
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
  const { record } = useSettingsNotify();
  const users = useAtomValue(usersAtom);
  const groups = useAtomValue(groupsAtom);
  const saveUser = useSetAtom(saveUserAtom);
  const isNew = userId === "new";
  const base = isNew ? undefined : users.find((u) => u.id === userId);
  const { id: _id, ...saved } = base ?? { id: "", ...NEW_USER };

  // Groups as a sorted set: unticking and re-ticking is no change.
  const { draft, update, dirty } = useSettingsDraft<UserDraft>({
    id: `user:${userId}`,
    label: "User edits",
    saved: { ...saved, groupIds: [...saved.groupIds].sort() },
  });
  /** The user was deleted (or the demo data reset) while this was open. */
  const missing = !isNew && !base;
  const { username, email, role, groupIds } = draft;
  const roleNote = base ? roleChangeBlock(users, base.id, "editor") : null;
  // Uwazi rejects a username or email another account has; login matches
  // case-insensitively, so this does too.
  const taken = userIdentityBlock(users, isNew ? null : userId, { username, email });
  const valid = !!username.trim() && !!email.trim() && !taken && !missing;

  const toggleGroup = (id: string) =>
    update({ groupIds: (groupIds.includes(id) ? groupIds.filter((g) => g !== id) : [...groupIds, id]).sort() });

  // An admin changing their own role loses System settings and Tools the
  // moment it saves (role gating, `atoms/settings.ts`): ask first.
  const me = useAtomValue(signedInUserAtom);
  const unlockUser = useSetAtom(unlockUserAtom);
  const demotesSelf = !!base && base.id === me?.id && base.role === "admin" && role !== "admin";
  const [askDemote, setAskDemote] = useState(false);
  const trySave = () => (demotesSelf ? setAskDemote(true) : save());

  const save = () => {
    setAskDemote(false);
    // 2FA and the lock are not edited here: Reset 2FA and Unlock account write
    // them at once, so the draft's copies may be stale.
    const { locked: _locked, ...fields } = draft;
    const id = saveUser({
      id: isNew ? null : userId,
      value: {
        ...fields,
        ...(base?.locked ? { locked: true } : {}),
        username: username.trim(),
        email: email.trim(),
        using2fa: base?.using2fa ?? false,
      },
    });
    if (!id) return;
    record({
      method: isNew ? "CREATE" : "UPDATE",
      domain: "user",
      noun: "user",
      id,
      name: username.trim(),
    });
    onClose();
  };

  /** Admin "Reset 2FA": behind the password check (G15), takes effect at once
   *  and clears the flag the user's Account card reads. */
  const patchUser = useSetAtom(usersStore.patchAtom);
  const [askReset2fa, setAskReset2fa] = useState(false);
  /** "Unlock account", behind the same password check (USR-14). */
  const [askUnlock, setAskUnlock] = useState(false);
  const unlock = () => {
    setAskUnlock(false);
    if (!base) return;
    unlockUser(base.id);
    record({ method: "UPDATE", domain: "user", noun: "user", id: base.id, name: base.username, summary: `Unlocked user “${base.username}”`, notice: "userUnlocked" });
  };
  const reset2fa = () => {
    setAskReset2fa(false);
    if (!base) return;
    patchUser({ id: base.id, patch: { using2fa: false } });
    record({
      method: "UPDATE",
      domain: "user",
      noun: "user",
      id: base.id,
      name: base.username,
      summary: `Reset two-factor authentication for “${base.username}”`,
      notice: "user2faDisabled",
    });
  };

  return (
    <SettingsEditor
      component="UserEditor"
      path={["Users & Groups"]}
      title={isNew ? "New user" : base?.username ?? ""}
      onBack={onClose}
      isNew={isNew}
      createLabel="Invite user"
      dirty={dirty}
      valid={valid}
      onSave={trySave}
      footerStart={<LastSavedLine domain="user" id={base?.id} />}
      overlays={
        <>
          <PasswordConfirmModal open={askReset2fa} onAccept={reset2fa} onCancel={() => setAskReset2fa(false)} />
          <PasswordConfirmModal open={askUnlock} onAccept={unlock} onCancel={() => setAskUnlock(false)} />
          <ConfirmDelete
            open={askDemote}
            title="Change your own role"
            message={`You will be ${role === "editor" ? "an Editor" : "a Collaborator"} as soon as this saves, and lose access to System settings${role === "editor" ? " and most Tools" : " and Tools"}. Another admin can change it back.`}
            impact={null}
            confirmLabel="Change my role"
            onConfirm={save}
            onCancel={() => setAskDemote(false)}
          />
        </>
      }
    >
      {missing && <MissingRecord noun="user" />}
      <SettingsSection>
        <SettingsFieldRow>
          <SettingsField label="Username" issue={taken?.username ? { severity: "error", message: taken.username } : null}>
            <TextInput value={username} onChange={(e) => update({ username: e.target.value })} placeholder="e.g. jdoe" />
          </SettingsField>
          <SettingsField label="Email" issue={taken?.email ? { severity: "error", message: taken.email } : null}>
            <TextInput type="email" value={email} onChange={(e) => update({ email: e.target.value })} placeholder="name@org.example" />
          </SettingsField>
        </SettingsFieldRow>
      </SettingsSection>

      <SettingsSection title="Role" description="What this user can do in the collection.">
        <RadioGroup
          name="user-role"
          ariaLabel="Role"
          value={role}
          onChange={(v) => update({ role: v as UserRole })}
          // The last admin stays one: Uwazi leaves this to the server.
          options={ROLE_OPTIONS.map((o) => ({ ...o, disabled: !!roleNote && o.id !== "admin" }))}
        />
        {roleNote && <p data-part="role-note" className="text-xs text-ink-tertiary">{roleNote}</p>}
      </SettingsSection>

      <SettingsSection title="Groups">
        <SettingsCheckList part="groups">
          {groups.map((g) => (
            <SettingsCheckRow key={g.id}>
              <Checkbox checked={groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} ariaLabel={g.name} />
              <span className="text-sm font-medium text-ink flex-1">{g.name}</span>
              <span className="text-xs text-ink-tertiary">{g.memberCount} {g.memberCount === 1 ? "member" : "members"}</span>
            </SettingsCheckRow>
          ))}
        </SettingsCheckList>
      </SettingsSection>

      {!isNew && base?.locked && (
        <SettingsSection title="Account locked" description="Uwazi locks an account after repeated failed sign-ins.">
          <div>
            <SettingsButton
              variant="secondary"
              size="sm"
              className="ring-1 ring-seal-label text-seal-label"
              onClick={() => setAskUnlock(true)}
            >
              Unlock account
            </SettingsButton>
          </div>
        </SettingsSection>
      )}

      {!isNew && (
        <SettingsSection title="Two-factor authentication">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-paper px-4 py-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-md bg-success-light shrink-0">
              <ShieldCheck size={16} aria-hidden className="text-success" />
            </span>
            <p className="text-sm text-ink flex-1 min-w-0">
              {base?.using2fa ? "2FA is enabled for this account." : "This account has not enabled 2FA."}
            </p>
            <SettingsButton variant="secondary" size="sm" disabled={!base?.using2fa} onClick={() => setAskReset2fa(true)}>
              Reset 2FA
            </SettingsButton>
          </div>
        </SettingsSection>
      )}
    </SettingsEditor>
  );
}
