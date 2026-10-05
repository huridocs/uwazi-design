import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ShieldCheck, KeyRound, Copy } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsField, TextInput } from "../SettingsField";
import { SettingsTable, type Column } from "../SettingsTable";
import { saveUserAtom, signedInUserAtom, userIdentityBlock, usersAtom } from "../../../atoms/users";
import type { SettingsUser } from "../../../data/settings";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { useNotify } from "../../../hooks/useNotify";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { ConfirmDialog } from "../../shared/ConfirmDialog";

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
  const { record } = useSettingsNotify();
  /** Every change to the account is a change to the signed-in user's record. */
  const logAccount = (message: string, method: "CREATE" | "UPDATE" | "DELETE" = "UPDATE", noun = "user") =>
    me && record({ method, domain: "user", noun, id: me.id, name: me.username, message });
  /** Revoke and Disable 2FA ask first (UX audit Summary 3). */
  const [ask, setAsk] = useState<{ kind: "revoke"; id: string } | { kind: "2fa" } | null>(null);

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
  const canSaveProfile = profile.dirty && !!username.trim() && !!email.trim() && !taken;
  const saveProfile = () => {
    if (!me) return;
    const next = { username: username.trim(), email: email.trim() };
    if (!patchUser({ id: me.id, patch: next })) return;
    profile.markSaved(next);
    logAccount("Profile saved");
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

  const savePassword = () => {
    pw.discard();
    logAccount("Password updated");
  };

  // ── Two-factor ─────────────────────────────────────────────────────────
  const twoFactorEnabled = !!me?.using2fa;
  const [setupOpen, setSetupOpen] = useState(false);
  const [code, setCode] = useState("");

  const verifyTwoFactor = () => {
    if (me) patchUser({ id: me.id, patch: { using2fa: true } });
    setSetupOpen(false);
    setCode("");
    logAccount("Two-factor authentication enabled");
  };

  const disableTwoFactor = () => {
    if (me) patchUser({ id: me.id, patch: { using2fa: false } });
    logAccount("Two-factor authentication disabled");
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
      width: "10rem",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyKey();
            }}
            aria-label="Copy key"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
          >
            <Copy size={13} />
            Copy
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAsk({ kind: "revoke", id: row.id });
            }}
            aria-label="Revoke key"
            className="px-2 py-1 rounded-md text-xs text-ink-tertiary hover:bg-seal-tint hover:text-seal-label transition-colors cursor-pointer"
          >
            Revoke
          </button>
        </div>
      ),
    },
  ];

  return (
    <SettingsContent component="AccountPage">
      <SettingsContent.Header title="Account" />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="text-sm font-semibold text-ink mb-1">Profile</h3>
            <p className="text-xs text-ink-tertiary mb-3">
              The username you log in with, and your email address.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <SettingsField label="Username" issue={taken?.username ? { severity: "error", message: taken.username } : null}>
                <TextInput value={username} onChange={(e) => profile.update({ username: e.target.value })} />
              </SettingsField>
              <SettingsField label="Email" issue={taken?.email ? { severity: "error", message: taken.email } : null}>
                <TextInput type="email" value={email} onChange={(e) => profile.update({ email: e.target.value })} />
              </SettingsField>
            </div>
            <div className="mt-3">
              <SettingsButton variant="success" size="sm" disabled={!canSaveProfile} onClick={saveProfile}>
                Save profile
              </SettingsButton>
            </div>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 className="text-sm font-semibold text-ink mb-1">Change password</h3>
            <p className="text-xs text-ink-tertiary mb-3">
              Choose a strong password you don't use elsewhere.
            </p>
            <div className="flex flex-col gap-3">
              <SettingsField label="Current password">
                <TextInput
                  type="password"
                  value={current}
                  onChange={(e) => pw.update({ current: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </SettingsField>
              <div className="grid sm:grid-cols-2 gap-3">
                <SettingsField label="New password">
                  <TextInput
                    type="password"
                    value={password}
                    onChange={(e) => pw.update({ password: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </SettingsField>
                <SettingsField
                  label="Confirm password"
                  error={mismatch ? "Passwords don't match" : undefined}
                >
                  <TextInput
                    type="password"
                    value={confirm}
                    onChange={(e) => pw.update({ confirm: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </SettingsField>
              </div>
              <div>
                <SettingsButton
                  variant="commit"
                  size="sm"
                  disabled={!canSavePassword}
                  onClick={savePassword}
                >
                  Update password
                </SettingsButton>
              </div>
            </div>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-ink mb-1">
                  Two-factor authentication
                </h3>
                <p className="text-xs text-ink-tertiary">
                  Add a second step at login using an authenticator app.
                </p>
              </div>
              {twoFactorEnabled && (
                <span className="w-fit inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success-light text-success text-xs font-medium">
                  <ShieldCheck size={13} />
                  Enabled
                </span>
              )}
            </div>

            {twoFactorEnabled ? (
              <SettingsButton variant="danger" size="sm" onClick={() => setAsk({ kind: "2fa" })}>
                Disable
              </SettingsButton>
            ) : setupOpen ? (
              <div className="rounded-lg border border-border bg-paper px-4 py-4 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className="flex items-center justify-center w-28 h-28 rounded-md bg-warm shrink-0"
                    style={{ border: "1px solid var(--border-primary)" }}
                  >
                    <span className="text-xs font-medium text-ink-tertiary">QR</span>
                  </div>
                  <p className="text-xs text-ink-tertiary pt-1">
                    Scan this code with your authenticator app, then enter the 6-digit
                    verification code it shows.
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
                  <SettingsButton
                    variant="commit"
                    size="sm"
                    disabled={code.length !== 6}
                    onClick={verifyTwoFactor}
                  >
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
              <SettingsButton variant="secondary" size="sm" onClick={() => setSetupOpen(true)}>
                Enable two-factor authentication
              </SettingsButton>
            )}
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-ink mb-1">
                  Personal access keys
                </h3>
                <p className="text-xs text-ink-tertiary">
                  Use these tokens to authenticate against the Uwazi API.
                </p>
              </div>
              <SettingsButton
                variant="secondary"
                size="sm"
                icon={<KeyRound size={14} />}
                onClick={generateKey}
              >
                Generate key
              </SettingsButton>
            </div>
            <SettingsTable
              columns={keyColumns}
              data={keys}
              getRowId={(row) => row.id}
              emptyState={
                <span className="text-sm text-ink-tertiary">No access keys yet.</span>
              }
            />
          </section>
        </div>
      </SettingsContent.Body>
      <ConfirmDialog
        open={ask !== null}
        title={ask?.kind === "revoke" ? "Revoke key" : "Disable two-factor authentication"}
        message={
          ask?.kind === "revoke"
            ? "Revoke this key? Anything that signs in with it stops working."
            : "Disable two-factor authentication? Signing in will need only your password."
        }
        confirmLabel={ask?.kind === "revoke" ? "Revoke" : "Disable"}
        variant="danger"
        onConfirm={() => {
          if (ask?.kind === "revoke") revokeKey(ask.id);
          else if (ask) disableTwoFactor();
          setAsk(null);
        }}
        onCancel={() => setAsk(null)}
      />
    </SettingsContent>
  );
}
