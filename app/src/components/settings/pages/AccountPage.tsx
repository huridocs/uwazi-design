import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Check, Copy, KeyRound } from "lucide-react";
import { SettingsButton } from "../SettingsButton";
import { SettingsFormPage } from "../SettingsEditor";
import { SettingsFieldRow, SettingsSection } from "../SettingsSection";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { RowActions } from "../RowActions";
import { SettingsField, TextInput } from "../SettingsField";
import { SettingsTable, type Column } from "../SettingsTable";
import { signedInUserAtom, userIdentityBlock, users, usersAtom } from "../../../atoms/users";
import { apiKeys, maskKey, myApiKeysAtom, newApiKey, type ApiKeyRecord } from "../../../atoms/apiKeys";
import type { UserRole } from "../../../data/settings";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { PasswordConfirmModal } from "../../shared/PasswordConfirmModal";
import { TwoFactorSetupModal } from "./account/TwoFactorSetupModal";

const ROLE_LABEL: Record<UserRole, string> = { admin: "Admin", editor: "Editor", collaborator: "Collaborator" };
/** Uwazi's `validEmailFormat`. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AccountDraft {
  email: string;
  password: string;
  confirm: string;
}

/** Settings › Account (Uwazi `Account.tsx`): General Information, Change
 *  Password and Two-Factor Authentication, one footer Update behind the
 *  current-password check (G15). API keys are prototype-only (G4). The
 *  account is the signed-in user's record in the users store, so Users &
 *  Groups and the login screen see each change. */
export function AccountPage() {
  const { record, fail } = useSettingsNotify();
  const me = useAtomValue(signedInUserAtom);
  const allUsers = useAtomValue(usersAtom);
  const patchUser = useSetAtom(users.patchAtom);

  const form = useSettingsDraft<AccountDraft>({
    id: "account",
    label: "Account edits",
    saved: { email: me?.email ?? "", password: "", confirm: "" },
  });
  const { email, password, confirm } = form.draft;

  // Errors show from the first Update on, and follow the fields after that.
  const [attempted, setAttempted] = useState(false);
  const emailError = attempted && !EMAIL.test(email.trim()) ? "A valid email is required" : null;
  const mismatch = attempted && password !== confirm;
  /** The email the "already exists" refusal was for: shown under Email while
   *  that address is still typed. */
  const [takenEmail, setTakenEmail] = useState<string | null>(null);
  const takenError = takenEmail !== null && takenEmail === email ? `The email "${email.trim()}" already exists` : null;
  const [asking, setAsking] = useState(false);

  const update = () => {
    setAttempted(true);
    if (!EMAIL.test(email.trim()) || password !== confirm) {
      document.getElementById(!EMAIL.test(email.trim()) ? "account-email" : "confirm-new-password")?.focus();
      return;
    }
    setAsking(true);
  };

  /** Accept in the password modal. The mock takes any password. */
  const save = () => {
    setAsking(false);
    if (!me) return;
    const next = email.trim();
    if (userIdentityBlock(allUsers, me.id, { username: me.username, email: next })?.email) {
      // Shown under the field and once in the Beacon. The typed password stays.
      const detail = `The email "${next}" already exists`;
      setTakenEmail(email);
      fail(undefined, detail);
      return;
    }
    const changes = next !== me.email ? [{ field: "Email", before: me.email, after: next }] : [];
    patchUser({ id: me.id, patch: { email: next } });
    if (password) changes.push({ field: "Password", before: "••••", after: "changed" });
    form.markSaved({ email: next, password: "", confirm: "" });
    setAttempted(false);
    record({
      method: "UPDATE",
      domain: "user",
      noun: "account",
      id: me.id,
      name: me.username,
      notice: "accountUpdated",
      changes,
    });
  };

  const discard = () => {
    form.discard();
    setAttempted(false);
    setTakenEmail(null);
  };

  // ── Two-factor ─────────────────────────────────────────────────────────
  const [settingUp, setSettingUp] = useState(false);
  const enable2fa = () => {
    if (!me) return;
    patchUser({ id: me.id, patch: { using2fa: true } });
    setSettingUp(false);
    record({
      method: "UPDATE",
      domain: "user",
      noun: "account",
      id: me.id,
      name: me.username,
      summary: `Enabled two-factor authentication for “${me.username}”`,
      notice: "account2faEnabled",
    });
  };

  // ── API keys (prototype-only, G4) ──────────────────────────────────────
  const keys = useAtomValue(myApiKeysAtom);
  const createKey = useSetAtom(apiKeys.createAtom);
  const deleteKey = useSetAtom(apiKeys.deleteAtom);
  const [keyName, setKeyName] = useState("");
  /** The full key, shown once until dismissed. */
  const [fresh, setFresh] = useState<{ id: string; name: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<ApiKeyRecord | null>(null);

  const generate = () => {
    if (!me) return;
    const name = keyName.trim() || "API key";
    const key = newApiKey();
    const id = createKey({ value: { userId: me.id, name, last4: key.slice(-4), created: Date.now() } });
    setFresh({ id, name, key });
    setCopied(false);
    setKeyName("");
    record({ method: "CREATE", domain: "apikey", noun: "API key", id, name, summary: `Generated API key “${name}”`, message: "API key generated" });
  };
  const copyFresh = async () => {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh.key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const revoke = (k: ApiKeyRecord) => {
    deleteKey({ id: k.id });
    record({ method: "DELETE", domain: "apikey", noun: "API key", id: k.id, name: k.name, summary: `Revoked API key “${k.name}”`, message: "API key revoked" });
  };

  const keyColumns: Column<ApiKeyRecord>[] = [
    { id: "name", header: "Name", cell: (k) => <span className="text-sm font-medium text-ink truncate">{k.name}</span> },
    {
      id: "token",
      header: "Key",
      cell: (k) => (
        <span dir="ltr" className="font-mono text-xs text-ink-secondary truncate">
          {maskKey(k.last4)}
        </span>
      ),
    },
    {
      id: "created",
      header: "Created",
      width: "8rem",
      cell: (k) => (
        <span className="text-xs text-ink-tertiary">
          {new Date(k.created).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      width: "4rem",
      align: "right",
      cell: (k) => <RowActions label={`API key ${k.name}`} deleteLabel="Revoke" onDelete={() => setRevoking(k)} />,
    },
  ];

  return (
    <SettingsFormPage
      component="AccountPage"
      title="Account"
      dirty={form.dirty}
      onSave={update}
      onDiscard={discard}
      saveLabel="Update"
      footerStatus={<LastSavedLine domain="user" id={me?.id} />}
      overlays={
        <>
          <PasswordConfirmModal open={asking} onAccept={save} onCancel={() => setAsking(false)} />
          {settingUp && <TwoFactorSetupModal onEnable={enable2fa} onCancel={() => setSettingUp(false)} />}
          <ConfirmDelete
            open={revoking !== null}
            title="Revoke API key"
            message={`Revoke “${revoking?.name}”? Anything that signs in with it stops working.`}
            impact={null}
            confirmLabel="Revoke"
            onConfirm={() => {
              if (revoking) revoke(revoking);
              setRevoking(null);
            }}
            onCancel={() => setRevoking(null)}
          />
        </>
      }
    >
      <SettingsSection title="General Information">
        <SettingsFieldRow>
          <SettingsField label="Username">
            <TextInput id="account-username" value={me?.username ?? ""} disabled readOnly className="disabled:text-ink-tertiary disabled:cursor-not-allowed" />
          </SettingsField>
          <SettingsField label="User Role">
            <TextInput id="account-role" value={me ? ROLE_LABEL[me.role] : ""} disabled readOnly className="disabled:text-ink-tertiary disabled:cursor-not-allowed" />
          </SettingsField>
        </SettingsFieldRow>
        <SettingsField label="Email" error={emailError ?? takenError ?? undefined}>
          <TextInput
            id="account-email"
            type="email"
            autoComplete="email"
            value={email}
            issue={emailError || takenError ? { severity: "error", message: "" } : null}
            onChange={(e) => form.update({ email: e.target.value })}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection title="Change Password">
        <SettingsFieldRow>
          <SettingsField label="New password">
            <TextInput
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              issue={mismatch ? { severity: "error", message: "" } : null}
              onChange={(e) => form.update({ password: e.target.value })}
            />
          </SettingsField>
          <SettingsField label="Confirm new password" error={mismatch ? "Passwords do not match" : undefined}>
            <TextInput
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              issue={mismatch ? { severity: "error", message: "" } : null}
              onChange={(e) => form.update({ confirm: e.target.value })}
            />
          </SettingsField>
        </SettingsFieldRow>
      </SettingsSection>

      <SettingsSection title="Two-Factor Authentication">
        <div data-part="2fa" className="flex flex-wrap items-center gap-3">
          {me?.using2fa ? (
            <>
              <SettingsButton variant="secondary" size="sm" disabled icon={<Check size={14} aria-hidden />}>
                Activated
              </SettingsButton>
              <p className="text-sm text-ink-secondary flex-1 min-w-[min(100%,14rem)]">
                Your account's security is enhanced with two-factor authentication.
              </p>
            </>
          ) : (
            <>
              <SettingsButton variant="secondary" size="sm" onClick={() => setSettingUp(true)}>
                Enable
              </SettingsButton>
              <p className="text-sm text-ink-secondary flex-1 min-w-[min(100%,14rem)]">
                You should activate this feature for enhanced account security.
              </p>
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="API keys"
        description="Keys let scripts call the Uwazi API as you. Prototype only: Uwazi has no API keys."
      >
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            generate();
          }}
        >
          <div className="flex-1 min-w-[min(100%,12rem)]">
            <SettingsField label="Key name">
              <TextInput value={keyName} onChange={(e) => setKeyName(e.target.value)} autoComplete="off" />
            </SettingsField>
          </div>
          <SettingsButton type="submit" variant="secondary" size="md" icon={<KeyRound size={14} aria-hidden />}>
            Generate
          </SettingsButton>
        </form>
        {fresh && (
          <div data-part="new-key" role="status" className="flex flex-col gap-2 rounded-lg bg-warm px-4 py-3">
            <p className="text-sm font-medium text-ink">
              {fresh.name}: copy this key now. You won't see this again.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code dir="ltr" className="flex-1 min-w-0 break-all font-mono text-xs text-ink bg-paper rounded-md px-2 py-1.5">
                {fresh.key}
              </code>
              <SettingsButton
                variant="secondary"
                size="sm"
                icon={copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                onClick={copyFresh}
              >
                {copied ? "Copied" : "Copy key"}
              </SettingsButton>
              <SettingsButton variant="ghost" size="sm" onClick={() => setFresh(null)}>
                Done
              </SettingsButton>
            </div>
          </div>
        )}
        <SettingsTable
          columns={keyColumns}
          data={fresh ? keys.filter((k) => k.id !== fresh.id) : keys}
          getRowId={(k) => k.id}
          emptyState={
            <SettingsEmptyState
              icon={<KeyRound size={16} />}
              title="No API keys yet"
              hint="Name a key and generate it to call the Uwazi API as yourself."
            />
          }
        />
      </SettingsSection>
    </SettingsFormPage>
  );
}
