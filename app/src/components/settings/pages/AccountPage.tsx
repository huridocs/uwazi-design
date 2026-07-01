import { useState } from "react";
import { useSetAtom } from "jotai";
import { ShieldCheck, KeyRound, Copy } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { Table, type Column } from "../Table";
import { currentAccount } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

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
  const setToasts = useSetAtom(toastsAtom);
  const toast = (message: string, type: "success" | "info" = "success") =>
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);

  // ── Profile ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState(currentAccount.email);
  const [username, setUsername] = useState(currentAccount.username);

  // ── Password ───────────────────────────────────────────────────────────
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = password.length > 0 && confirm.length > 0 && password !== confirm;
  const canSavePassword =
    current.length > 0 && password.length > 0 && confirm.length > 0 && password === confirm;

  const savePassword = () => {
    setCurrent("");
    setPassword("");
    setConfirm("");
    toast("Password updated");
  };

  // ── Two-factor ─────────────────────────────────────────────────────────
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [code, setCode] = useState("");

  const verifyTwoFactor = () => {
    setTwoFactorEnabled(true);
    setSetupOpen(false);
    setCode("");
    toast("Two-factor authentication enabled");
  };

  const disableTwoFactor = () => {
    setTwoFactorEnabled(false);
    toast("Two-factor authentication disabled", "info");
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
    toast("API key generated");
  };

  const copyKey = () => toast("Key copied", "info");
  const revokeKey = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
    toast("Key revoked", "info");
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
              revokeKey(row.id);
            }}
            aria-label="Revoke key"
            className="px-2 py-1 rounded-md text-xs text-ink-tertiary hover:bg-seal-tint hover:text-seal transition-colors cursor-pointer"
          >
            Revoke
          </button>
        </div>
      ),
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Account" />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          {/* Profile */}
          <section>
            <h3 className="text-sm font-semibold text-ink mb-1">Profile</h3>
            <p className="text-xs text-ink-tertiary mb-3">
              The address and name you use to sign in.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Username">
                <TextInput value={username} onChange={(e) => setUsername(e.target.value)} />
              </Field>
              <Field label="Email">
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Password */}
          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 className="text-sm font-semibold text-ink mb-1">Change password</h3>
            <p className="text-xs text-ink-tertiary mb-3">
              Choose a strong password you don't use elsewhere.
            </p>
            <div className="flex flex-col gap-3">
              <Field label="Current password">
                <TextInput
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="New password">
                  <TextInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </Field>
                <Field
                  label="Confirm password"
                  error={mismatch ? "Passwords don't match" : undefined}
                >
                  <TextInput
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </Field>
              </div>
              <div>
                <Button
                  variant="success"
                  size="sm"
                  disabled={!canSavePassword}
                  onClick={savePassword}
                >
                  Update password
                </Button>
              </div>
            </div>
          </section>

          {/* Two-factor */}
          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-ink mb-1">
                  Two-factor authentication
                </h3>
                <p className="text-xs text-ink-tertiary">
                  Add a second step at sign-in using an authenticator app.
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
              <Button variant="danger" size="sm" onClick={disableTwoFactor}>
                Disable
              </Button>
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
                  <Field label="Verification code">
                    <TextInput
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                    />
                  </Field>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    disabled={code.length !== 6}
                    onClick={verifyTwoFactor}
                  >
                    Verify &amp; enable
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSetupOpen(false);
                      setCode("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setSetupOpen(true)}>
                Enable two-factor authentication
              </Button>
            )}
          </section>

          {/* API keys */}
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
              <Button
                variant="secondary"
                size="sm"
                icon={<KeyRound size={14} />}
                onClick={generateKey}
              >
                Generate key
              </Button>
            </div>
            <Table
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
    </SettingsContent>
  );
}
