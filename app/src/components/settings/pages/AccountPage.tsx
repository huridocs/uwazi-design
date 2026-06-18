import { useState } from "react";
import { useSetAtom } from "jotai";
import { ShieldCheck } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { currentAccount } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

export function AccountPage() {
  const setToasts = useSetAtom(toastsAtom);
  const [email, setEmail] = useState(currentAccount.email);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const dirty = email !== currentAccount.email || password.length > 0;
  const mismatch = password.length > 0 && confirm.length > 0 && password !== confirm;

  const save = () => {
    setPassword("");
    setConfirm("");
    setToasts((prev) => [
      ...prev,
      { id: Date.now().toString(), message: "Account updated", type: "success" as const },
    ]);
  };

  return (
    <SettingsContent>
      <SettingsContent.Header title="Account" />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="text-sm font-semibold text-ink mb-1">Email</h3>
            <p className="text-xs text-ink-tertiary mb-3">
              The address you use to sign in and receive notifications.
            </p>
            <Field label="Email">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 className="text-sm font-semibold text-ink mb-1">Change password</h3>
            <p className="text-xs text-ink-tertiary mb-3">
              Leave blank to keep your current password.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="New password">
                <TextInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Field label="Confirm password" error={mismatch ? "Passwords don't match" : undefined}>
                <TextInput
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            </div>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 className="text-sm font-semibold text-ink mb-3">Two-factor authentication</h3>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-paper px-4 py-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-md bg-success-light shrink-0">
                <ShieldCheck size={16} className="text-success" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">2FA is enabled</p>
                <p className="text-xs text-ink-tertiary">
                  Your account is protected with an authenticator app.
                </p>
              </div>
              <Button variant="secondary" size="sm">
                Manage
              </Button>
            </div>
          </section>
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        {dirty && <span className="text-xs text-ink-tertiary me-auto">Unsaved changes</span>}
        <Button variant="success" size="sm" disabled={!dirty || mismatch} onClick={save}>
          Update account
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
