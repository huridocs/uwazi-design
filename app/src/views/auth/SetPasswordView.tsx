import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Info } from "lucide-react";
import { authLinkAtom, goToLoginAtom, resetPasswordAtom } from "../../atoms/auth";
import { collectionSettings } from "../../atoms/settingsSingletons";
import {
  AUTH_TEXT_LINK,
  AuthHeading,
  AuthLayout,
  AuthMessage,
  AuthPasswordField,
  AuthSubmit,
  type AuthMessageValue,
} from "../../components/auth/AuthLayout";
import { DemoAccounts } from "../../components/auth/DemoAccounts";
import { COMMIT_FILL } from "../../components/shared/warmButton";

/** Set or reset a password from an emailed link (Uwazi `/setpassword/:key`,
 *  `?createAccount=true` from the welcome email). Two fields that must match
 *  and must not be empty; no other rule, as in Uwazi. A saved password also
 *  unlocks the account and spends the link; the reader then logs in (it does
 *  not sign them in).
 *
 *  Uwazi checks the key only on Save and answers a bad one with a toast on the
 *  same page. The prototype says it on a page of its own, with a way to ask
 *  for a new link (a prototype addition). */
export function SetPasswordView({ linkKey, createAccount }: { linkKey: string; createAccount: boolean }) {
  const collectionName = useAtomValue(collectionSettings.valueAtom).name;
  const reset = useSetAtom(resetPasswordAtom);
  const goToLogin = useSetAtom(goToLoginAtom);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [message, setMessage] = useState<AuthMessageValue>(null);
  const [pending, setPending] = useState(false);
  const [expired, setExpired] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const messageId = useId();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (expired) titleRef.current?.focus();
  }, [expired]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!password.trim() || password !== repeat) {
      setMismatch(true);
      setMessage({ tone: "error", text: password.trim() ? "Passwords don't match." : "Enter a password." });
      firstRef.current?.focus();
      return;
    }
    setMismatch(false);
    setMessage(null);
    setPending(true);
    timer.current = window.setTimeout(() => {
      setPending(false);
      if (!reset({ key: linkKey, password })) {
        setPassword("");
        setRepeat("");
        setExpired(true);
        return;
      }
      goToLogin({
        tone: "note",
        text: createAccount ? "Your account is ready. Log in with your new password." : "Your password is saved. Log in with it.",
      });
    }, 500);
  };

  if (expired) {
    return (
      <AuthLayout component="SetPasswordView">
        <div data-part="expired">
          <AuthHeading
            titleRef={titleRef}
            eyebrow={collectionName}
            title="This link no longer works"
            lead={"Links to set a password are valid for 24 hours and work once. Ask\u00a0for a new one with the email of your account."}
          />
          <button
            type="button"
            data-part="request-new"
            onClick={() => goToLogin(null, "forgot")}
            className={`mt-8 w-full h-10 flex items-center justify-center rounded-md ${COMMIT_FILL} text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:ring-carbon/50`}
          >
            Request a new link
          </button>
          <div className="mt-4 flex justify-center">
            <button type="button" data-part="cancel" onClick={() => goToLogin(null)} className={AUTH_TEXT_LINK}>
              Back to log in
            </button>
          </div>
          <DemoAccounts />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout component="SetPasswordView">
      <form data-part="form" onSubmit={submit} noValidate aria-describedby={messageId}>
        <AuthHeading
          titleRef={titleRef}
          eyebrow={collectionName}
          title={createAccount ? "Create your password" : "Set a new password"}
        />
        {createAccount && (
          <p data-part="create-account" className="mt-4 flex items-start gap-2 rounded-md bg-carbon-tint/40 px-3 py-2.5 text-sm text-ink">
            <Info size={15} aria-hidden className="mt-0.5 shrink-0 text-carbon-label" />
            <span className="text-pretty">To complete the account creation process, please create a password for your account.</span>
          </p>
        )}
        <div className="mt-8">
          <AuthPasswordField
            label="Password"
            name="password"
            inputRef={firstRef}
            autoComplete="new-password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              if (mismatch) setMismatch(false);
            }}
            disabled={pending}
            invalid={mismatch}
            describedBy={messageId}
          />
        </div>
        <div className="mt-4">
          <AuthPasswordField
            label="Repeat password"
            name="repeat-password"
            autoComplete="new-password"
            value={repeat}
            onChange={(v) => {
              setRepeat(v);
              if (mismatch) setMismatch(false);
            }}
            disabled={pending}
            invalid={mismatch}
            describedBy={messageId}
          />
        </div>
        <AuthMessage id={messageId} message={message} />
        <AuthSubmit pending={pending} label="Save password" pendingLabel="Saving…" />
        <div className="mt-4 flex justify-center">
          <button type="button" data-part="cancel" onClick={() => goToLogin(null)} className={AUTH_TEXT_LINK}>
            Back to log in
          </button>
        </div>
        <DemoAccounts />
      </form>
    </AuthLayout>
  );
}

/** The page an email link opens, read from `authLinkAtom`. */
export function SetPasswordRoute() {
  const link = useAtomValue(authLinkAtom);
  const key = link?.kind === "set-password" ? link.key : "";
  // A new link remounts the page, so an expired state never carries over.
  return <SetPasswordView key={key} linkKey={key} createAccount={link?.kind === "set-password" && link.createAccount} />;
}
