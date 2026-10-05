import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ShieldCheck, KeyRound, Copy } from "lucide-react";
import { SettingsButton } from "../SettingsButton";
import { SettingsFormPage } from "../SettingsEditor";
import { SettingsFieldRow, SettingsSection } from "../SettingsSection";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { RowActionButton, RowActions } from "../RowActions";
import { SettingsField, TextInput } from "../SettingsField";
import { SettingsTable, type Column } from "../SettingsTable";
import { saveUserAtom, signedInUserAtom, userIdentityBlock, usersAtom } from "../../../atoms/users";
import type { SettingsUser } from "../../../data/settings";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { useNotify } from "../../../hooks/useNotify";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { ConfirmDelete } from "../../shared/ConfirmDelete";

interface ApiKey {
  id: string;
  token: string;
  created: string;
}

const seedKeys: ApiKey[] = [
  { id: "k1", token: "uwz_live_••••3f9a", created: "12 Jan 2026" },
  { id: "k2", token: "uwz_live_••••8c21", created: "04 Mar 2026" },
];

function randomKey(): string {
  const tail = Math.random().toString(16).slice(2, 6);
  return `uwz_live_••••${tail}`;
}

export function AccountPage() {
  const notify = useNotify();
  const toast = (message: string, type: "success" | "info" = "success") =>
    notify(message, type);
  const { record, fail } = useSettingsNotify();
  /** Every change to the account is a change to the signed-in user's record. */
  // API keys live in this page's state, so their changes are not logged.
  const logAccount = (message: string, method: "CREATE" | "UPDATE" | "DELETE" = "UPDATE", noun = "user") =>
    me && record({ method, domain: "user", noun, id: me.id, name: me.username, message, log: noun === "user" });
  /** Revoke asks first (UX audit Summary 3). */
  const [ask, setAsk] = useState<{ kind: "revoke"; id: string } | null>(null);

  // ── Profile ────────────────────────────────────────────────────────────
  // The signed-in user's record in the users store, so Settings › Users and
  // the login screen see the change.
  const me = useAtomValue(signedInUserAtom);
  // Through the store's rules (unique username and email), like the editor.
  const saveUser = useSetAtom(saveUserAtom);
  const patchUser = ({ id, patch }: { id: string; patch: Partial<SettingsUser> }) => {
    const current = me && me.id === id ? me : undefined;
    if (!current) return null;
    const { id: _id, ...rest } = current;
    return saveUser({ id, value: { ...rest, ...patch } });
  };
  const profile = useSettingsDraft({
    id: "account-profile",
    label: "Profile edits",
    saved: { username: me?.username ?? "", email: me?.email ?? "" },
  });
  const { username, email } = profile.draft;
  // Another account's username or email would make login pick the wrong one.
  const taken = userIdentityBlock(useAtomValue(usersAtom), me?.id ?? null, { username, email });
  const profileValid = !!username.trim() && !!email.trim() && !taken;
  /** False when the store refuses the change. */
  const saveProfile = () => {
    if (!me) return false;
    const next = { username: username.trim(), email: email.trim() };
    if (!patchUser({ id: me.id, patch: next })) return false;
    profile.markSaved(next);
    return true;
  };

  // ── Password ───────────────────────────────────────────────────────────
  const pw = useSettingsDraft({
    id: "account-password",
    label: "Password changes",
    saved: { current: "", password: "", confirm: "" },
  });
  const { current, password, confirm } = pw.draft;
  const mismatch = password.length > 0 && confirm.length > 0 && password !== confirm;
  const canSavePassword =
    current.length > 0 && password.length > 0 && confirm.length > 0 && password === confirm;

  const savePassword = () => pw.discard();

  // One save for the page: the profile and the password are two drafts, and
  // the footer commits whichever has changes. Each must be complete to save.
  const dirty = profile.dirty || pw.dirty;
  const valid = (!profile.dirty || profileValid) && (!pw.dirty || canSavePassword);
  const saveAll = () => {
    const both = profile.dirty && pw.dirty;
    const message = both ? "Profile and password saved" : profile.dirty ? "Profile saved" : "Password updated";
    if (profile.dirty && !saveProfile()) return;
    if (pw.dirty) savePassword();
    logAccount(message);
  };
  const discardAll = () => {
    profile.discard();
    pw.discard();
  };

  // ── Two-factor ─────────────────────────────────────────────────────────
  const twoFactorEnabled = !!me?.using2fa;
  const [setupOpen, setSetupOpen] = useState(false);
  const [code, setCode] = useState("");

  const verifyTwoFactor = () => {
    // The store refuses a record that breaks its rules (a username or email
    // another account has); say so rather than closing as if it worked.
    if (me && !patchUser({ id: me.id, patch: { using2fa: true } })) {
      fail("Two-factor authentication was not enabled", "Another account has this username or email. Change it under Profile first.");
      return;
    }
    setSetupOpen(false);
    setCode("");
    logAccount("Two-factor authentication enabled");
  };


  // ── API keys ───────────────────────────────────────────────────────────
  const [keys, setKeys] = useState<ApiKey[]>(seedKeys);

  const generateKey = () => {
    const key: ApiKey = {
      id: Date.now().toString(),
      token: randomKey(),
      created: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
    setKeys((prev) => [key, ...prev]);
    logAccount("API key generated", "CREATE", "API key for");
  };

  const copyKey = () => toast("Key copied", "info");
  const revokeKey = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
    logAccount("Key revoked", "DELETE", "API key for");
  };

  const keyColumns: Column<ApiKey>[] = [
    {
      id: "token",
      header: "Token",
      width: "1fr",
      cell: (row) => (
        <span className="font-mono text-sm text-ink">{row.token}</span>
      ),
    },
    {
      id: "created",
      header: "Created",
      width: "10rem",
      cell: (row) => <span className="text-sm text-ink-secondary">{row.created}</span>,
    },
    {
      id: "actions",
      header: "",
      width: "5rem",
      align: "right",
      cell: (row) => (
        <RowActions label={`key ${row.token}`} deleteLabel="Revoke" onDelete={() => setAsk({ kind: "revoke", id: row.id })}>
          <RowActionButton label={`Copy key ${row.token}`} icon={<Copy size={14} aria-hidden />} onClick={copyKey} />
        </RowActions>
      ),
    },
  ];

  return (
    <SettingsFormPage
      component="AccountPage"
      title="Account"
      dirty={dirty}
      valid={valid}
      onSave={saveAll}
      onDiscard={discardAll}
      overlays={
        <ConfirmDelete
          open={ask !== null}
          title="Revoke key"
          message="Revoke this key? Anything that signs in with it stops working."
          impact={null}
          confirmLabel="Revoke"
          onConfirm={() => {
            if (ask) revokeKey(ask.id);
            setAsk(null);
          }}
          onCancel={() => setAsk(null)}
        />
      }
    >
      <SettingsSection title="Profile" description="The username you log in with, and your email address.">
        <SettingsFieldRow>
          <SettingsField label="Username" issue={taken?.username ? { severity: "error", message: taken.username } : null}>
            <TextInput value={username} onChange={(e) => profile.update({ username: e.target.value })} />
          </SettingsField>
          <SettingsField label="Email" issue={taken?.email ? { severity: "error", message: taken.email } : null}>
            <TextInput type="email" value={email} onChange={(e) => profile.update({ email: e.target.value })} />
          </SettingsField>
        </SettingsFieldRow>
      </SettingsSection>

      <SettingsSection title="Change password" description="Choose a strong password you don't use elsewhere.">
        <SettingsField label="Current password">
          <TextInput
            type="password"
            value={current}
            onChange={(e) => pw.update({ current: e.target.value })}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </SettingsField>
        <SettingsFieldRow>
          <SettingsField label="New password">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => pw.update({ password: e.target.value })}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </SettingsField>
          <SettingsField label="Confirm password" error={mismatch ? "Passwords don't match" : undefined}>
            <TextInput
              type="password"
              value={confirm}
              onChange={(e) => pw.update({ confirm: e.target.value })}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </SettingsField>
        </SettingsFieldRow>
      </SettingsSection>

      <SettingsSection
        title="Two-factor authentication"
        description="Add a second step at login using an authenticator app."
        action={
          twoFactorEnabled && (
            <span className="w-fit inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success-light text-success text-xs font-medium">
              <ShieldCheck size={13} aria-hidden />
              Enabled
            </span>
          )
        }
      >
        {twoFactorEnabled ? (
          // Uwazi has no self-disable: an admin resets 2FA from Users (G4).
          <p data-part="2fa-note" className="text-xs text-ink-tertiary">
            To turn it off, ask an admin to reset it in Users &amp; Groups.
          </p>
        ) : setupOpen ? (
          <div className="rounded-lg border border-border bg-paper px-4 py-4 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-28 h-28 rounded-md bg-warm shrink-0 border border-border">
                <span className="text-xs font-medium text-ink-tertiary">QR</span>
              </div>
              <p className="text-xs text-ink-tertiary pt-1">
                Scan this code with your authenticator app, then enter the 6-digit verification code it shows.
              </p>
            </div>
            <div className="max-w-[16rem]">
              <SettingsField label="Verification code">
                <TextInput
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                />
              </SettingsField>
            </div>
            <div className="flex items-center gap-2">
              <SettingsButton variant="commit" size="sm" disabled={code.length !== 6} onClick={verifyTwoFactor}>
                Verify &amp; enable
              </SettingsButton>
              <SettingsButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSetupOpen(false);
                  setCode("");
                }}
              >
                Cancel
              </SettingsButton>
            </div>
          </div>
        ) : (
          <div>
            <SettingsButton variant="secondary" size="sm" onClick={() => setSetupOpen(true)}>
              Enable two-factor authentication
            </SettingsButton>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Personal access keys"
        description="Use these tokens to authenticate against the Uwazi API."
        action={
          <SettingsButton variant="secondary" size="sm" icon={<KeyRound size={14} />} onClick={generateKey}>
            Generate key
          </SettingsButton>
        }
      >
        <SettingsTable
          columns={keyColumns}
          data={keys}
          getRowId={(row) => row.id}
          emptyState={
            <SettingsEmptyState
              icon={<KeyRound size={16} />}
              title="No access keys yet"
              hint="Generate a key to call the Uwazi API as yourself."
              action={{ label: "Generate key", onClick: generateKey }}
            />
          }
        />
      </SettingsSection>
    </SettingsFormPage>
  );
}
